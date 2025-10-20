-- Battle Mode MVP schema (rooms, participants, rounds, answers)
-- Note: Adjust RLS policies later to bind with real session identity.

-- Enable pgcrypto for gen_random_uuid if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) battle_rooms
CREATE TABLE IF NOT EXISTS public.battle_rooms (
  id TEXT PRIMARY KEY,
  host_session_id TEXT NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE RESTRICT,
  topic TEXT NULL,
  category_id TEXT NULL REFERENCES public.quiz_categories(id) ON DELETE SET NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  num_questions INTEGER NOT NULL CHECK (num_questions > 0),
  round_time_sec INTEGER NOT NULL CHECK (round_time_sec BETWEEN 5 AND 600),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','starting','active','finished','cancelled')),
  start_time TIMESTAMPTZ NULL,
  capacity INTEGER NULL CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON public.battle_rooms(status);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_category ON public.battle_rooms(category_id);

-- 2) battle_room_participants
CREATE TABLE IF NOT EXISTS public.battle_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_score INTEGER NOT NULL DEFAULT 0,
  connection_status TEXT NOT NULL DEFAULT 'online' CHECK (connection_status IN ('online','offline')),
  CONSTRAINT uq_battle_participant UNIQUE (room_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_participants_room ON public.battle_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_session ON public.battle_room_participants(session_id);

-- 3) battle_room_rounds
CREATE TABLE IF NOT EXISTS public.battle_room_rounds (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  round_no INTEGER NOT NULL CHECK (round_no >= 1),
  question_id TEXT NULL REFERENCES public.quiz_questions(id) ON DELETE SET NULL,
  question_json JSONB NULL,
  revealed_at TIMESTAMPTZ NULL,
  deadline_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','closed')),
  CONSTRAINT uq_battle_round_per_room UNIQUE (room_id, round_no)
);

CREATE INDEX IF NOT EXISTS idx_battle_rounds_room ON public.battle_room_rounds(room_id);

-- 4) battle_room_answers
CREATE TABLE IF NOT EXISTS public.battle_room_answers (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL REFERENCES public.battle_room_rounds(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  score_ai INTEGER NULL CHECK (score_ai BETWEEN 0 AND 100),
  score_rule INTEGER NULL CHECK (score_rule BETWEEN 0 AND 100),
  score_final INTEGER NOT NULL CHECK (score_final BETWEEN 0 AND 100),
  feedback TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_battle_answer_once UNIQUE (round_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_answers_room ON public.battle_room_answers(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_round ON public.battle_room_answers(round_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_session ON public.battle_room_answers(session_id);

-- RLS: Enable but start permissive for MVP (tighten later)
ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_room_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_room_answers ENABLE ROW LEVEL SECURITY;

-- WARNING: The following permissive policies are for MVP development only.
-- Replace with by-room membership checks bound to server session tokens.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_rooms' AND policyname = 'mvp_all_select') THEN
    CREATE POLICY mvp_all_select ON public.battle_rooms FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_rooms' AND policyname = 'mvp_all_insert') THEN
    CREATE POLICY mvp_all_insert ON public.battle_rooms FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_rooms' AND policyname = 'mvp_all_update') THEN
    CREATE POLICY mvp_all_update ON public.battle_rooms FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_rooms' AND policyname = 'mvp_all_delete') THEN
    CREATE POLICY mvp_all_delete ON public.battle_rooms FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_participants' AND policyname = 'mvp_all_select') THEN
    CREATE POLICY mvp_all_select ON public.battle_room_participants FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_participants' AND policyname = 'mvp_all_insert') THEN
    CREATE POLICY mvp_all_insert ON public.battle_room_participants FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_participants' AND policyname = 'mvp_all_update') THEN
    CREATE POLICY mvp_all_update ON public.battle_room_participants FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_participants' AND policyname = 'mvp_all_delete') THEN
    CREATE POLICY mvp_all_delete ON public.battle_room_participants FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_rounds' AND policyname = 'mvp_all_select') THEN
    CREATE POLICY mvp_all_select ON public.battle_room_rounds FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_rounds' AND policyname = 'mvp_all_insert') THEN
    CREATE POLICY mvp_all_insert ON public.battle_room_rounds FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_rounds' AND policyname = 'mvp_all_update') THEN
    CREATE POLICY mvp_all_update ON public.battle_room_rounds FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_rounds' AND policyname = 'mvp_all_delete') THEN
    CREATE POLICY mvp_all_delete ON public.battle_room_rounds FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_answers' AND policyname = 'mvp_all_select') THEN
    CREATE POLICY mvp_all_select ON public.battle_room_answers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_answers' AND policyname = 'mvp_all_insert') THEN
    CREATE POLICY mvp_all_insert ON public.battle_room_answers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_answers' AND policyname = 'mvp_all_update') THEN
    CREATE POLICY mvp_all_update ON public.battle_room_answers FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'battle_room_answers' AND policyname = 'mvp_all_delete') THEN
    CREATE POLICY mvp_all_delete ON public.battle_room_answers FOR DELETE USING (true);
  END IF;
END $$;

