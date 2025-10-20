import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { publishBattleEvent } from '@/src/lib/realtime';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/session';
import { supabaseAdmin } from '@/src/lib/supabase';

const ReadySchema = z.object({
  ready: z.boolean(),
});

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

    const body = ReadySchema.parse(await req.json().catch(() => ({})));

    const supabase = supabaseAdmin();

    const { data: participant, error: participantErr } = await supabase
      .from('battle_room_participants')
      .select(
        'id, session_id, display_name, is_ready, connection_status, is_host'
      )
      .eq('room_id', roomId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (participantErr) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    if (!participant) {
      return createErrorResponse(ERROR_TYPES.NOT_PARTICIPANT);
    }

    // Prevent readying when offline to avoid stale states
    if (participant.connection_status === 'offline') {
      return createErrorResponse({
        code: 'PARTICIPANT_OFFLINE',
        message:
          'You appear to be offline—please reconnect before setting ready.',
        retryable: true,
        statusCode: 400,
      });
    }

    if (participant.is_ready === body.ready) {
      return NextResponse.json({ ok: true, alreadySet: true });
    }

    const { error: updateErr } = await supabase
      .from('battle_room_participants')
      .update({ is_ready: body.ready })
      .eq('id', participant.id);

    if (updateErr) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    await publishBattleEvent({
      roomId,
      event: 'participant_ready',
      payload: {
        sessionId: participant.session_id,
        participantId: participant.id,
        displayName: participant.display_name,
        isReady: body.ready,
        isHost: participant.is_host,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
