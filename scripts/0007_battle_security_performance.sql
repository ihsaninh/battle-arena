-- Harden battle RLS and improve performance

-- 1) Recreate battle helper functions with locked-down security context
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

REVOKE EXECUTE ON FUNCTION public.close_round_and_update_scores(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_round_and_update_scores(TEXT, TEXT) TO service_role;

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

REVOKE EXECUTE ON FUNCTION public.increment_participant_score(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_participant_score(TEXT, TEXT, INTEGER) TO service_role;

-- validate_session_exists does not require definer privileges; tighten search_path and revoke public access
CREATE OR REPLACE FUNCTION public.validate_session_exists(session_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.quiz_sessions
    WHERE id = session_id_param
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_session_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_session_exists(TEXT) TO service_role;

-- 2) Restrict RLS policies to service role
DROP POLICY IF EXISTS "battle_rooms_service_role_access" ON public.battle_rooms;
CREATE POLICY "battle_rooms_service_role_access" ON public.battle_rooms
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "battle_participants_service_role_access" ON public.battle_room_participants;
CREATE POLICY "battle_participants_service_role_access" ON public.battle_room_participants
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "battle_rounds_service_role_access" ON public.battle_room_rounds;
CREATE POLICY "battle_rounds_service_role_access" ON public.battle_room_rounds
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "battle_answers_service_role_access" ON public.battle_room_answers;
CREATE POLICY "battle_answers_service_role_access" ON public.battle_room_answers
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 3) Harden room_code constraints
ALTER TABLE public.battle_rooms
  DROP CONSTRAINT IF EXISTS battle_rooms_room_code_key,
  ADD CONSTRAINT battle_rooms_room_code_format
    CHECK (room_code IS NULL OR room_code ~ '^[A-Z0-9]{6}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_battle_rooms_room_code_unique
  ON public.battle_rooms(room_code)
  WHERE room_code IS NOT NULL;

-- 4) Add supporting indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_battle_rooms_host_session
  ON public.battle_rooms(host_session_id);

CREATE INDEX IF NOT EXISTS idx_battle_rooms_created_at
  ON public.battle_rooms(created_at);

CREATE INDEX IF NOT EXISTS idx_battle_rounds_room_status
  ON public.battle_room_rounds(room_id, status);

CREATE INDEX IF NOT EXISTS idx_battle_rounds_revealed_at
  ON public.battle_room_rounds(revealed_at);

CREATE INDEX IF NOT EXISTS idx_battle_answers_room_round
  ON public.battle_room_answers(room_id, round_id);

CREATE INDEX IF NOT EXISTS idx_battle_answers_created_at
  ON public.battle_room_answers(created_at);
