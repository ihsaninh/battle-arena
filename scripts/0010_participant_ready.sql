-- Adds ready flag for battle participants to gate battle start

ALTER TABLE public.battle_room_participants
  ADD COLUMN IF NOT EXISTS is_ready BOOLEAN NOT NULL DEFAULT false;

-- Ensure existing rows have the default applied explicitly
UPDATE public.battle_room_participants
SET is_ready = false
WHERE is_ready IS DISTINCT FROM false;
