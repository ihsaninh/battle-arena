-- Allow scoreboard intermediate status for battle rounds

ALTER TABLE public.battle_room_rounds
  DROP CONSTRAINT IF EXISTS battle_room_rounds_status_check;

ALTER TABLE public.battle_room_rounds
  ADD CONSTRAINT battle_room_rounds_status_check
  CHECK (
    status IN (
      'pending',
      'revealed',
      'active',
      'scoreboard',
      'closed'
    )
  );

-- Optional: ensure status column uses new allowed value for existing rows
-- UPDATE public.battle_room_rounds
-- SET status = 'scoreboard'
-- WHERE status = 'closed' AND <additional conditions>;
