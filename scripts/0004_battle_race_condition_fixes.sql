-- Fix race conditions in battle auto-advance logic
-- Add database functions for atomic operations

-- Function to atomically close round and update all participant scores
CREATE OR REPLACE FUNCTION close_round_and_update_scores(p_round_id TEXT, p_room_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_round_closed BOOLEAN := FALSE;
    v_answers_count INTEGER;
    v_participants_count INTEGER;
    v_result JSON;
BEGIN
    -- Check if round can be closed (all participants answered)
    SELECT COUNT(*) INTO v_answers_count
    FROM battle_room_answers
    WHERE round_id = p_round_id;

    SELECT COUNT(*) INTO v_participants_count
    FROM battle_room_participants
    WHERE room_id = p_room_id;

    -- Only proceed if everyone has answered
    IF v_answers_count >= v_participants_count THEN
        -- Close the round atomically
        UPDATE battle_room_rounds
        SET status = 'scoreboard'
        WHERE id = p_round_id AND status = 'active';

        -- Check if update was successful
        IF FOUND THEN
            v_round_closed := TRUE;

            -- Update participant scores atomically
            UPDATE battle_room_participants
            SET total_score = COALESCE(total_score, 0) + COALESCE(answers.score_final, 0)
            FROM (
                SELECT session_id, score_final
                FROM battle_room_answers
                WHERE round_id = p_round_id
            ) answers
            WHERE battle_room_participants.room_id = p_room_id
            AND battle_room_participants.session_id = answers.session_id;
        END IF;
    END IF;

    -- Return result
    v_result := json_build_object(
        'round_closed', v_round_closed,
        'answers_count', v_answers_count,
        'participants_count', v_participants_count
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically increment participant score
CREATE OR REPLACE FUNCTION increment_participant_score(
    p_room_id TEXT,
    p_session_id TEXT,
    p_score_increment INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Use upsert to handle the increment atomically
    INSERT INTO battle_room_participants (room_id, session_id, total_score)
    VALUES (p_room_id, p_session_id, p_score_increment)
    ON CONFLICT (room_id, session_id)
    DO UPDATE SET
        total_score = COALESCE(battle_room_participants.total_score, 0) + p_score_increment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION close_round_and_update_scores(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_participant_score(TEXT, TEXT, INTEGER) TO service_role;
