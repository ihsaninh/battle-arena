import { NextRequest, NextResponse } from 'next/server';

import { publishBattleEvent } from '@/src/lib/client/realtime';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string; roundNo: string }> }
) {
  try {
    const { roomId, roundNo } = await context.params;
    const sessionId = getBattleSessionIdFromCookies(req);
    if (!sessionId) {
      return createErrorResponse(ERROR_TYPES.MISSING_SESSION);
    }
    const supabase = supabaseAdmin();

    // Load room for timer
    const { data: room, error: roomErr } = await supabase
      .from('battle_rooms')
      .select('id, status, round_time_sec, host_session_id')
      .eq('id', roomId)
      .single();
    if (roomErr || !room) {
      return createErrorResponse(ERROR_TYPES.ROOM_NOT_FOUND);
    }

    const { data: membership, error: membershipErr } = await supabase
      .from('battle_room_participants')
      .select('is_host')
      .eq('room_id', roomId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (membershipErr && membershipErr.code !== 'PGRST116') {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    const isHostSession = room.host_session_id === sessionId;

    if (!isHostSession && !membership?.is_host) {
      return createErrorResponse({
        code: 'NOT_HOST',
        message: 'Only the room host can reveal rounds.',
        retryable: false,
        statusCode: 403,
      });
    }

    if (room.status !== 'active')
      return createErrorResponse({
        code: 'ROOM_NOT_ACTIVE',
        message: 'The battle has not been started yet.',
        retryable: false,
        statusCode: 400,
      });

    const now = new Date();
    const deadline = new Date(now.getTime() + room.round_time_sec * 1000);

    // Update the specified round to active
    const { error: updErr } = await supabase
      .from('battle_room_rounds')
      .update({
        status: 'active',
        revealed_at: now.toISOString(),
        deadline_at: deadline.toISOString(),
      })
      .eq('room_id', roomId)
      .eq('round_no', Number(roundNo));

    if (updErr) {
      console.error(updErr);
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Broadcast
    await publishBattleEvent({
      roomId,
      event: 'round_revealed',
      payload: {
        roundNo: Number(roundNo),
        revealedAt: now.toISOString(),
        deadlineAt: deadline.toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      revealedAt: now.toISOString(),
      deadlineAt: deadline.toISOString(),
    });
  } catch (e: unknown) {
    console.error('Reveal round exception', e);
    return createErrorResponse(e);
  }
}
