-- Add room_code field for shorter invite codes
-- This allows users to share a short code instead of the long roomId

ALTER TABLE public.battle_rooms ADD COLUMN room_code VARCHAR(10) UNIQUE;

-- Create index for room_code lookups
CREATE INDEX IF NOT EXISTS idx_battle_rooms_room_code ON public.battle_rooms(room_code);

-- Update RLS policies to include room_code
-- Since we're using service role access, the existing policies should work
-- but we'll ensure room_code is accessible in queries