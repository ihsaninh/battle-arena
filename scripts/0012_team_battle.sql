-- ============================================================================
-- TEAM BATTLE MIGRATION
-- ============================================================================
-- Adds support for 2-team battle mode with auto-shuffle assignment
-- ============================================================================

-- ============================================================================
-- 1. ADD BATTLE_MODE TO BATTLE_ROOMS
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battle_rooms' 
    AND column_name = 'battle_mode'
  ) THEN
    ALTER TABLE public.battle_rooms 
      ADD COLUMN battle_mode VARCHAR(20) NOT NULL DEFAULT 'individual' 
      CHECK (battle_mode IN ('individual', 'team'));
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE BATTLE_TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.battle_teams (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  team_name VARCHAR(50) NOT NULL,
  team_color VARCHAR(20) NOT NULL,
  team_order INTEGER NOT NULL CHECK (team_order >= 0),
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_battle_team_room_order UNIQUE (room_id, team_order)
);

-- Indexes for battle_teams
CREATE INDEX IF NOT EXISTS idx_battle_teams_room ON public.battle_teams(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_teams_room_order ON public.battle_teams(room_id, team_order);

-- ============================================================================
-- 3. ADD TEAM_ID TO BATTLE_ROOM_PARTICIPANTS
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battle_room_participants' 
    AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.battle_room_participants 
      ADD COLUMN team_id TEXT NULL REFERENCES public.battle_teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for team queries
CREATE INDEX IF NOT EXISTS idx_battle_participants_team ON public.battle_room_participants(team_id);

-- ============================================================================
-- 4. UPDATE TEAM SCORES FUNCTION
-- ============================================================================
-- Function to recalculate team scores from participant scores
CREATE OR REPLACE FUNCTION public.update_team_scores(p_room_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update each team's total_score by summing participant scores
  UPDATE public.battle_teams t
  SET total_score = COALESCE((
    SELECT SUM(p.total_score)
    FROM public.battle_room_participants p
    WHERE p.team_id = t.id
  ), 0)
  WHERE t.room_id = p_room_id;
END;
$$;

-- Grant execute permission
REVOKE EXECUTE ON FUNCTION public.update_team_scores(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_team_scores(TEXT) TO service_role;

-- ============================================================================
-- 5. MODIFY CLOSE_ROUND FUNCTION TO UPDATE TEAM SCORES
-- ============================================================================
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
    v_battle_mode TEXT;
    v_result JSON;
BEGIN
    -- Get battle mode
    SELECT battle_mode INTO v_battle_mode
    FROM public.battle_rooms
    WHERE id = p_room_id;

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

            -- Update participant scores
            UPDATE public.battle_room_participants AS p
            SET total_score = COALESCE(p.total_score, 0) + COALESCE(a.score_final, 0)
            FROM (
                SELECT session_id, score_final
                FROM public.battle_room_answers
                WHERE round_id = p_round_id
            ) AS a
            WHERE p.room_id = p_room_id
              AND p.session_id = a.session_id;

            -- If team mode, update team scores
            IF v_battle_mode = 'team' THEN
                PERFORM public.update_team_scores(p_room_id);
            END IF;
        END IF;
    END IF;

    v_result := json_build_object(
        'round_closed', v_round_closed,
        'answers_count', v_answers_count,
        'participants_count', v_participants_count,
        'battle_mode', v_battle_mode
    );

    RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. RLS POLICIES FOR BATTLE_TEAMS
-- ============================================================================
ALTER TABLE public.battle_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "battle_teams_service_role_access" ON public.battle_teams
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Team battle support added:
-- - battle_mode column in battle_rooms (individual/team)
-- - battle_teams table for team metadata
-- - team_id column in participants for team membership
-- - update_team_scores function for aggregating team scores
-- - Modified close_round function to update team scores
-- ============================================================================
