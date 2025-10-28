import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/src/lib/utils/logger';

import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { supabaseAdmin } from '@/src/lib/database/supabase';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const supabase = supabaseAdmin();

    // Fetch participants and their scores
    const { data: participants, error: pErr } = await supabase
      .from('battle_room_participants')
      .select('id, session_id, display_name, total_score, team_id')
      .eq('room_id', roomId);
    if (pErr) {
      apiLogger.error(pErr);
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Sum answer times (MCQ) per session for tie-breaker
    const sessionIds = (participants || []).map(p => p.session_id);
    let timeBySession = new Map<string, number>();
    if (sessionIds.length > 0) {
      const { data: times } = await supabase
        .from('battle_room_answers')
        .select('session_id, time_ms')
        .eq('room_id', roomId);
      timeBySession = new Map(
        (times || []).reduce((acc: Array<[string, number]>, t) => {
          const key = t.session_id as string;
          const v = Number(t.time_ms) || 0;
          const prev = acc.find(([k]) => k === key)?.[1] || 0;
          // Update or push
          const idx = acc.findIndex(([k]) => k === key);
          if (idx >= 0) acc[idx][1] = prev + v;
          else acc.push([key, v]);
          return acc;
        }, [])
      );
    }

    const board = (participants || []).map(p => ({
      participantId: p.id,
      sessionId: p.session_id,
      displayName: p.display_name,
      totalScore: p.total_score || 0,
      timeTotalMs: timeBySession.get(p.session_id) || 0,
      teamId: p.team_id || undefined,
    }));

    board.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.timeTotalMs - b.timeTotalMs; // tie-breaker: faster wins
    });

    return NextResponse.json({ scoreboard: board });
  } catch (e) {
    apiLogger.error('Scoreboard exception', e);
    return createErrorResponse(e);
  }
}
