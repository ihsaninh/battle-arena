import { NextRequest, NextResponse } from 'next/server';

import { publishBattleEvent } from '@/src/lib/client/realtime';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';

/**
 * Manual advance API - fallback for when auto-advance fails
 * This endpoint can be called to force progression to the next round
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const sessionId = getBattleSessionIdFromCookies(req);

    if (!sessionId) {
      return createErrorResponse(ERROR_TYPES.MISSING_SESSION);
    }

    const supabase = supabaseAdmin();

    // Verify the user is a participant in this room
    const { data: participant } = await supabase
      .from('battle_room_participants')
      .select('is_host')
      .eq('room_id', roomId)
      .eq('session_id', sessionId)
      .single();

    if (!participant) {
      return createErrorResponse({
        code: 'NOT_PARTICIPANT',
        message: 'You are not a participant in this room.',
        retryable: false,
        statusCode: 403,
      });
    }

    // Only hosts can manually advance
    if (!participant.is_host) {
      return createErrorResponse({
        code: 'NOT_HOST',
        message: 'Only the room host can advance rounds.',
        retryable: false,
        statusCode: 403,
      });
    }

    // Get the current room status
    const { data: room } = await supabase
      .from('battle_rooms')
      .select('status, num_questions, round_time_sec')
      .eq('id', roomId)
      .single();

    if (!room || room.status !== 'active') {
      return createErrorResponse({
        code: 'ROOM_NOT_ACTIVE',
        message: 'The battle has not been started yet.',
        retryable: false,
        statusCode: 400,
      });
    }

    // Find the most recent round in scoreboard state
    const { data: scoreboardRound } = await supabase
      .from('battle_room_rounds')
      .select('id, round_no')
      .eq('room_id', roomId)
      .eq('status', 'scoreboard')
      .order('round_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scoreboardRound) {
      return createErrorResponse({
        code: 'NO_SCOREBOARD_ROUND',
        message: 'There is no round waiting on the scoreboard stage.',
        retryable: false,
        statusCode: 400,
      });
    }

    const nextRoundNo = scoreboardRound.round_no + 1;

    // Check if this is the last round
    // Mark scoreboard round as fully closed
    await supabase
      .from('battle_room_rounds')
      .update({ status: 'closed' })
      .eq('id', scoreboardRound.id)
      .eq('status', 'scoreboard');

    if (nextRoundNo > room.num_questions) {
      await supabase
        .from('battle_rooms')
        .update({ status: 'finished' })
        .eq('id', roomId);

      await publishBattleEvent({
        roomId,
        event: 'match_finished',
        payload: { roomId },
      });

      return NextResponse.json({
        message: 'Battle finished',
        action: 'finished',
      });
    }

    // Reveal next round
    const now = new Date();
    const deadline = new Date(
      now.getTime() + (room.round_time_sec || 60) * 1000
    );

    const { data: revealedRound, error: revealErr } = await supabase
      .from('battle_room_rounds')
      .update({
        status: 'active',
        revealed_at: now.toISOString(),
        deadline_at: deadline.toISOString(),
      })
      .eq('room_id', roomId)
      .eq('round_no', nextRoundNo)
      .eq('status', 'pending')
      .select('round_no')
      .single();

    if (revealErr || !revealedRound) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Broadcast round revealed
    await publishBattleEvent({
      roomId,
      event: 'round_revealed',
      payload: {
        roundNo: nextRoundNo,
        revealedAt: now.toISOString(),
        deadlineAt: deadline.toISOString(),
        reason: 'manual_advance',
      },
    });

    return NextResponse.json({
      message: 'Round advanced successfully',
      roundNo: nextRoundNo,
      action: 'advanced',
    });
  } catch (error) {
    console.error('Manual advance failed:', error);
    return createErrorResponse(error);
  }
}
