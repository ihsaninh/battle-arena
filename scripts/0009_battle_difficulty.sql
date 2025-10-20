-- Add optional difficulty preference to battle rooms
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS difficulty TEXT
  CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard'));
