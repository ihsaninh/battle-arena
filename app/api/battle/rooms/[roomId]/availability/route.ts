import { NextRequest, NextResponse } from 'next/server';

import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { supabaseAdmin } from '@/src/lib/database/supabase';

type RoomStatus = 'waiting' | 'active' | 'finished' | string;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId: rawRoomIdentifier } = await context.params;
    const roomIdentifier = rawRoomIdentifier.trim();

    if (!roomIdentifier) {
      return createErrorResponse(ERROR_TYPES.ROOM_NOT_FOUND);
    }

    const supabase = supabaseAdmin();
    const baseSelect =
      'id, status, capacity, room_code, topic, language, num_questions, difficulty, round_time_sec';

    // Try to resolve by room ID first
    let roomQuery = supabase
      .from('battle_rooms')
      .select(baseSelect)
      .eq('id', roomIdentifier);

    let { data: room, error: roomErr } = await roomQuery.single();

    // If not found, try resolving by room code (normalized to uppercase)
    if (roomErr && roomErr.code === 'PGRST116') {
      roomQuery = supabase
        .from('battle_rooms')
        .select(baseSelect)
        .eq('room_code', roomIdentifier.toUpperCase());

      const retry = await roomQuery.single();
      room = retry.data;
      roomErr = retry.error;
    }

    if (roomErr || !room) {
      return createErrorResponse(ERROR_TYPES.ROOM_NOT_FOUND);
    }

    const status = (room.status || 'waiting') as RoomStatus;

    let currentParticipants: number | null = null;
    if (room.capacity) {
      const { count, error: countErr } = await supabase
        .from('battle_room_participants')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id);

      if (!countErr) {
        currentParticipants = count ?? null;
      }
    }

    let joinable = status === 'waiting';

    if (joinable && room.capacity && currentParticipants !== null) {
      if (currentParticipants >= room.capacity) {
        joinable = false;
      }
    }

    let message: string | undefined;
    if (!joinable) {
      switch (status) {
        case 'active':
          message =
            'This battle is currently in progress. Please wait for the next session.';
          break;
        case 'finished':
          message =
            'This battle has already finished. Ask the host to open a new room.';
          break;
        default:
          message =
            room.capacity && currentParticipants !== null
              ? 'This room has reached its maximum capacity.'
              : 'This room is not accepting new participants right now.';
      }
    } else if (room.capacity && currentParticipants !== null) {
      const slotsLeft = room.capacity - currentParticipants;
      if (slotsLeft <= 0) {
        joinable = false;
        message = 'This room has reached its maximum capacity.';
      }
    }

    return NextResponse.json({
      roomId: room.id,
      status,
      joinable,
      capacity: room.capacity,
      currentParticipants,
      message,
      roomCode: room.room_code,
      meta: {
        topic: room.topic,
        language: room.language,
        numQuestions: room.num_questions,
        difficulty: room.difficulty,
        roundTimeSec: room.round_time_sec,
      },
    });
  } catch (e: unknown) {
    console.error('Room availability exception', e);
    return createErrorResponse(e);
  }
}
