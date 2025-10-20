-- 0008_battle_presence_offline.sql
-- Adds presence tracking columns and winner metadata for disconnect handling

ALTER TABLE public.battle_room_participants
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_battle_participants_last_seen
  ON public.battle_room_participants(last_seen_at);

ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS finished_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS winner_session_id TEXT NULL REFERENCES public.quiz_sessions(id);

CREATE INDEX IF NOT EXISTS idx_battle_rooms_winner
  ON public.battle_rooms(winner_session_id);
