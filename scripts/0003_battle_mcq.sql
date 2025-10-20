-- MCQ support for Battle mode
-- 1) Add question_type to battle_rooms
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'open-ended' CHECK (question_type IN ('open-ended','multiple-choice'));

-- 2) Extend battle_room_answers to support MCQ and timing-based scoring
ALTER TABLE public.battle_room_answers
  ADD COLUMN IF NOT EXISTS choice_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_correct BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS time_ms INTEGER NULL CHECK (time_ms IS NULL OR time_ms >= 0);

-- Optional indexes to help lookups by correctness
CREATE INDEX IF NOT EXISTS idx_battle_answers_round_correct ON public.battle_room_answers(round_id, is_correct);

