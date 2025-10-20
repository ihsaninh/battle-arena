import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handlePresenceUpdate } from '@/src/lib/presence';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/session';
import { supabaseAdmin } from '@/src/lib/supabase';

const PresenceSchema = z.object({
  status: z.enum(['online', 'offline']),
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

    const payload = PresenceSchema.parse(await req.json().catch(() => ({})));

    const supabase = supabaseAdmin();
    const { data: membership, error: membershipErr } = await supabase
      .from('battle_room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (membershipErr) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    if (!membership) {
      return createErrorResponse(ERROR_TYPES.NOT_PARTICIPANT);
    }

    const result = await handlePresenceUpdate({
      roomId,
      sessionId,
      status: payload.status,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return createErrorResponse(error);
  }
}
