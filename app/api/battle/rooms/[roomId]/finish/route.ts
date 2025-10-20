import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { publishBattleEvent } from '@/src/lib/realtime';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/session';
import { supabaseAdmin } from '@/src/lib/supabase';

const FinishSchema = z.object({});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    FinishSchema.parse(await req.json().catch(() => ({})));
    const supabase = supabaseAdmin();
    const hostSessionId = getBattleSessionIdFromCookies(req);
    if (!hostSessionId) {
      return createErrorResponse(ERROR_TYPES.MISSING_SESSION);
    }

    // Validate host
    const { data: room, error: rErr } = await supabase
      .from('battle_rooms')
      .select('id, host_session_id, status')
      .eq('id', roomId)
      .single();
    if (rErr || !room) return createErrorResponse(ERROR_TYPES.ROOM_NOT_FOUND);
    if (room.host_session_id !== hostSessionId)
      return createErrorResponse({
        code: 'NOT_HOST',
        message: 'Only the room host can finish the battle.',
        retryable: false,
        statusCode: 403,
      });

    // Ensure all rounds are closed
    const { count: openCount } = await supabase
      .from('battle_room_rounds')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .neq('status', 'closed');
    if (openCount && openCount > 0) {
      return createErrorResponse({
        code: 'ROUNDS_STILL_ACTIVE',
        message:
          'Cannot finish battle while there are still active or pending rounds.',
        retryable: false,
        statusCode: 400,
      });
    }

    // Fetch final standings from participants totals
    const { data: participants, error: pErr } = await supabase
      .from('battle_room_participants')
      .select('id, display_name, total_score, is_host')
      .eq('room_id', roomId);
    if (pErr) {
      console.error(pErr);
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    const standings = (participants || [])
      .map(p => ({
        participantId: p.id,
        displayName: p.display_name,
        totalScore: p.total_score || 0,
        isHost: p.is_host,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    const { error: updErr } = await supabase
      .from('battle_rooms')
      .update({ status: 'finished' })
      .eq('id', roomId);
    if (updErr) {
      console.error(updErr);
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Broadcast match finished with standings (names + totals only)
    await publishBattleEvent({
      roomId,
      event: 'match_finished',
      payload: { standings },
    });

    return NextResponse.json({ ok: true, standings });
  } catch (e: unknown) {
    console.error('Finish exception', e);
    return createErrorResponse(e);
  }
}
