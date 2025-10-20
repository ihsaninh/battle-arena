-- ============================================================================
-- BATTLE MODE - FINAL SCHEMA MIGRATION
-- ============================================================================
-- Complete battle schema with independent battle_sessions
-- This migration creates all tables, functions, policies, and indexes
-- in their final state without incremental alterations.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. BATTLE SESSIONS TABLE (Independent from quiz_sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.battle_sessions (
  id TEXT PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  fingerprint_hash TEXT UNIQUE NOT NULL,
  device_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_battle_sessions_device ON public.battle_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_battle_sessions_fingerprint ON public.battle_sessions(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_battle_sessions_created_at ON public.battle_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_battle_sessions_last_active ON public.battle_sessions(last_active_at);

-- ============================================================================
-- 2. BATTLE ROOMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.battle_rooms (
  id TEXT PRIMARY KEY,
  host_session_id TEXT NOT NULL REFERENCES public.battle_sessions(id) ON DELETE RESTRICT,
  room_code VARCHAR(10) UNIQUE NULL,
  topic TEXT NULL,
  category_id TEXT NULL REFERENCES public.quiz_categories(id) ON DELETE SET NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  difficulty TEXT NULL CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard')),
  question_type TEXT NOT NULL DEFAULT 'open-ended' CHECK (question_type IN ('open-ended','multiple-choice')),
  num_questions INTEGER NOT NULL CHECK (num_questions > 0),
  round_time_sec INTEGER NOT NULL CHECK (round_time_sec BETWEEN 5 AND 600),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','starting','active','finished','cancelled')),
  start_time TIMESTAMPTZ NULL,
  capacity INTEGER NULL CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 100),
  finished_reason TEXT NULL,
  winner_session_id TEXT NULL REFERENCES public.battle_sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT battle_rooms_room_code_format CHECK (room_code IS NULL OR room_code ~ '^[A-Z0-9]{6}$')
);

-- Indexes for battle_rooms
CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON public.battle_rooms(status);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_category ON public.battle_rooms(category_id);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_host_session ON public.battle_rooms(host_session_id);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_created_at ON public.battle_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_winner ON public.battle_rooms(winner_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_battle_rooms_room_code_unique ON public.battle_rooms(room_code) WHERE room_code IS NOT NULL;

-- ============================================================================
-- 3. BATTLE ROOM PARTICIPANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.battle_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES public.battle_sessions(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  connection_status TEXT NOT NULL DEFAULT 'online' CHECK (connection_status IN ('online','offline')),
  CONSTRAINT uq_battle_participant UNIQUE (room_id, session_id)
);

-- Indexes for battle_room_participants
CREATE INDEX IF NOT EXISTS idx_battle_participants_room ON public.battle_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_session ON public.battle_room_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_last_seen ON public.battle_room_participants(last_seen_at);

-- ============================================================================
-- 4. BATTLE ROOM ROUNDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.battle_room_rounds (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  round_no INTEGER NOT NULL CHECK (round_no >= 1),
  question_id TEXT NULL REFERENCES public.quiz_questions(id) ON DELETE SET NULL,
  question_json JSONB NULL,
  revealed_at TIMESTAMPTZ NULL,
  deadline_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','revealed','active','scoreboard','closed')),
  CONSTRAINT uq_battle_round_per_room UNIQUE (room_id, round_no)
);

-- Indexes for battle_room_rounds
CREATE INDEX IF NOT EXISTS idx_battle_rounds_room ON public.battle_room_rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_rounds_room_status ON public.battle_room_rounds(room_id, status);
CREATE INDEX IF NOT EXISTS idx_battle_rounds_revealed_at ON public.battle_room_rounds(revealed_at);

-- ============================================================================
-- 5. BATTLE ROOM ANSWERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.battle_room_answers (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL REFERENCES public.battle_room_rounds(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES public.battle_sessions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  choice_id TEXT NULL,
  is_correct BOOLEAN NULL,
  time_ms INTEGER NULL CHECK (time_ms IS NULL OR time_ms >= 0),
  score_ai INTEGER NULL CHECK (score_ai BETWEEN 0 AND 100),
  score_rule INTEGER NULL CHECK (score_rule BETWEEN 0 AND 100),
  score_final INTEGER NOT NULL CHECK (score_final BETWEEN 0 AND 100),
  feedback TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_battle_answer_once UNIQUE (round_id, session_id)
);

-- Indexes for battle_room_answers
CREATE INDEX IF NOT EXISTS idx_battle_answers_room ON public.battle_room_answers(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_round ON public.battle_room_answers(round_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_session ON public.battle_room_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_round_correct ON public.battle_room_answers(round_id, is_correct);
CREATE INDEX IF NOT EXISTS idx_battle_answers_room_round ON public.battle_room_answers(room_id, round_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_created_at ON public.battle_room_answers(created_at);

-- ============================================================================
-- 6. DATABASE FUNCTIONS
-- ============================================================================

-- Function: Close round and update all participant scores atomically
CREATE OR REPLACE FUNCTION public.close_round_and_update_scores(p_round_id TEXT, p_room_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_round_closed BOOLEAN := FALSE;
    v_answers_count INTEGER;
    v_participants_count INTEGER;
    v_result JSON;
BEGIN
    SELECT COUNT(*) INTO v_answers_count
    FROM public.battle_room_answers
    WHERE round_id = p_round_id;

    SELECT COUNT(*) INTO v_participants_count
    FROM public.battle_room_participants
    WHERE room_id = p_room_id;

    IF v_answers_count >= v_participants_count THEN
        UPDATE public.battle_room_rounds
        SET status = 'scoreboard'
        WHERE id = p_round_id AND status = 'active';

        IF FOUND THEN
            v_round_closed := TRUE;

            UPDATE public.battle_room_participants AS p
            SET total_score = COALESCE(p.total_score, 0) + COALESCE(a.score_final, 0)
            FROM (
                SELECT session_id, score_final
                FROM public.battle_room_answers
                WHERE round_id = p_round_id
            ) AS a
            WHERE p.room_id = p_room_id
              AND p.session_id = a.session_id;
        END IF;
    END IF;

    v_result := json_build_object(
        'round_closed', v_round_closed,
        'answers_count', v_answers_count,
        'participants_count', v_participants_count
    );

    RETURN v_result;
END;
$$;

-- Function: Increment participant score atomically
CREATE OR REPLACE FUNCTION public.increment_participant_score(
    p_room_id TEXT,
    p_session_id TEXT,
    p_score_increment INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.battle_room_participants (room_id, session_id, total_score)
    VALUES (p_room_id, p_session_id, p_score_increment)
    ON CONFLICT (room_id, session_id)
    DO UPDATE SET
        total_score = COALESCE(public.battle_room_participants.total_score, 0) + p_score_increment;
END;
$$;

-- Function: Validate session exists
CREATE OR REPLACE FUNCTION public.validate_battle_session_exists(session_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.battle_sessions
    WHERE id = session_id_param
  );
END;
$$;

-- Grant execute permissions to service role
REVOKE EXECUTE ON FUNCTION public.close_round_and_update_scores(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_round_and_update_scores(TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_participant_score(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_participant_score(TEXT, TEXT, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_battle_session_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_battle_session_exists(TEXT) TO service_role;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all battle tables
ALTER TABLE public.battle_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_room_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_room_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role only (API routes use service role for full control)
-- This ensures security while allowing flexible access patterns via API layer

CREATE POLICY "battle_sessions_service_role_access" ON public.battle_sessions
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "battle_rooms_service_role_access" ON public.battle_rooms
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "battle_participants_service_role_access" ON public.battle_room_participants
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "battle_rounds_service_role_access" ON public.battle_room_rounds
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "battle_answers_service_role_access" ON public.battle_room_answers
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All battle tables, functions, indexes, and policies are now in their final state.
-- This schema supports:
-- - Independent battle sessions
-- - Multiple choice and open-ended questions
-- - Room codes for easy sharing
-- - Difficulty levels
-- - Presence tracking with last_seen_at
-- - Ready status for participants
-- - Winner tracking with finished_reason
-- - Atomic score updates and round closing
-- - Comprehensive indexing for performance
-- - Service-role-only RLS policies for security
-- ============================================================================
