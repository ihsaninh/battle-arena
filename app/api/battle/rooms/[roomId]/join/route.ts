import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { publishBattleEvent } from '@/src/lib/client/realtime';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';

const JoinRoomSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const json = await req.json();
    const body = JoinRoomSchema.parse(json);
    const sessionId = getBattleSessionIdFromCookies(req);
    if (!sessionId) {
      return createErrorResponse(ERROR_TYPES.MISSING_SESSION);
    }

    const supabase = supabaseAdmin();

    // Validate room is joinable - try roomId first, then roomCode
    let roomQuery = supabase
      .from('battle_rooms')
      .select('id, status, capacity, host_session_id')
      .eq('id', roomId);

    let { data: room, error: roomErr } = await roomQuery.single();

    // If not found by roomId, try roomCode
    if (roomErr && roomErr.code === 'PGRST116') {
      roomQuery = supabase
        .from('battle_rooms')
        .select('id, status, capacity, host_session_id')
        .eq('room_code', roomId);

      const roomCodeResult = await roomQuery.single();
      room = roomCodeResult.data;
      roomErr = roomCodeResult.error;
    }

    if (roomErr || !room) {
      return createErrorResponse(ERROR_TYPES.ROOM_NOT_FOUND);
    }

    if (room.status !== 'waiting') {
      return createErrorResponse({
        code: 'ROOM_NOT_JOINABLE',
        message: 'This room is not currently accepting new participants.',
        retryable: false,
        statusCode: 400,
      });
    }

    // Enforce capacity if set
    if (room.capacity) {
      const { count } = await supabase
        .from('battle_room_participants')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id);
      if ((count ?? 0) >= room.capacity) {
        return createErrorResponse({
          code: 'ROOM_FULL',
          message: 'This room has reached its maximum capacity.',
          retryable: false,
          statusCode: 400,
        });
      }
    }

    // Ensure session exists
    const { data: session, error: sessionErr } = await supabase
      .from('battle_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
    if (sessionErr || !session) {
      return createErrorResponse(ERROR_TYPES.INVALID_SESSION);
    }

    // Resolve display name from session (single source of truth)
    const { data: sRec } = await supabase
      .from('battle_sessions')
      .select('display_name')
      .eq('id', sessionId)
      .single();
    const resolvedName =
      (sRec?.display_name as string) || body.displayName || 'Player';

    // Check if this session is the room host
    const isHost = room.host_session_id === sessionId;

    // Insert participant (idempotent by unique constraint)
    const nowIso = new Date().toISOString();

    const { data: participant, error: joinErr } = await supabase
      .from('battle_room_participants')
      .insert({
        room_id: room.id,
        session_id: sessionId,
        display_name: resolvedName,
        is_host: isHost, // Set host status based on session check
        connection_status: 'online',
        last_seen_at: nowIso,
      })
      .select('id')
      .single();

    if (joinErr) {
      // If duplicate, treat as success and fetch existing participant
      if (joinErr.code === '23505') {
        const { data: existing } = await supabase
          .from('battle_room_participants')
          .select('id')
          .eq('room_id', room.id)
          .eq('session_id', sessionId)
          .single();

        // Update host status if this is the host rejoining
        const updatePayload: Record<string, unknown> = {
          display_name: resolvedName,
          connection_status: 'online',
          last_seen_at: nowIso,
        };

        if (isHost) {
          updatePayload.is_host = true;
        }

        await supabase
          .from('battle_room_participants')
          .update(updatePayload)
          .eq('room_id', room.id)
          .eq('session_id', sessionId);

        return NextResponse.json({ participantId: existing?.id });
      }
      console.error('Join room error', joinErr);
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Broadcast player joined (idempotent if duplicate join handled)
    await publishBattleEvent({
      roomId: room.id,
      event: 'player_joined',
      payload: { participantId: participant?.id, displayName: resolvedName },
    });

    return NextResponse.json({
      participantId: participant?.id,
      roomId: room.id,
    });
  } catch (e: unknown) {
    console.error('Join room exception', e);
    return createErrorResponse(e);
  }
}
