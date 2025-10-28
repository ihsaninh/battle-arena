import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/src/lib/utils/logger';

import { publishBattleEvent } from '@/src/lib/client/realtime';
import { buildScoreboardDetails } from '@/src/lib/utils/scoreboard-utils';
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

    // Close round (idempotent)
    const { data: round, error: rErr } = await supabase
      .from('battle_room_rounds')
      .select('id, status')
      .eq('room_id', roomId)
      .eq('round_no', Number(roundNo))
      .single();
    if (rErr || !round)
      return createErrorResponse({
        code: 'ROUND_NOT_FOUND',
        message: 'The specified round was not found.',
        retryable: false,
        statusCode: 404,
      });

    const { data: room, error: roomErr } = await supabase
      .from('battle_rooms')
      .select('host_session_id, status')
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
        message: 'Only the room host can close the round.',
        retryable: false,
        statusCode: 403,
      });
    }

    let justClosed = false;
    let usedFallback = false;
    if (round.status !== 'scoreboard' && round.status !== 'closed') {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'close_round_and_update_scores',
        {
          p_round_id: round.id,
          p_room_id: roomId,
        }
      );

      if (rpcError) {
        apiLogger.error('[CLOSE_ROUND] RPC failed, falling back', rpcError);
      }

      if (rpcResult?.round_closed) {
        justClosed = true;
      } else {
        const { data: closedRows, error: updErr } = await supabase
          .from('battle_room_rounds')
          .update({ status: 'scoreboard' })
          .eq('id', round.id)
          .eq('status', 'active')
          .select('id');

        if (updErr) {
          return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
        }

        justClosed = Array.isArray(closedRows) && closedRows.length > 0;
        usedFallback = justClosed;
      }

      if (justClosed) {
        round.status = 'scoreboard';
      }
    }

    // Scoreboard for this round
    const { data: answers, error: aErr } = await supabase
      .from('battle_room_answers')
      .select('session_id, score_final')
      .eq('round_id', round.id);
    if (aErr) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Increment participant totals only once when transitioning to closed
    if (usedFallback && answers && answers.length > 0) {
      for (const a of answers) {
        const { data: curr } = await supabase
          .from('battle_room_participants')
          .select('total_score')
          .eq('room_id', roomId)
          .eq('session_id', a.session_id)
          .single();
        const next = (curr?.total_score || 0) + (a.score_final || 0);
        await supabase
          .from('battle_room_participants')
          .update({ total_score: next })
          .eq('room_id', roomId)
          .eq('session_id', a.session_id);
      }
    }

    const { data: participants } = await supabase
      .from('battle_room_participants')
      .select('session_id, display_name, id, total_score')
      .eq('room_id', roomId);

    const roundScores = new Map(
      (answers || []).map(a => [a.session_id, a.score_final || 0])
    );

    const scoreboard = (participants || [])
      .map(participant => {
        const roundScore = roundScores.get(participant.session_id) || 0;
        return {
          participantId: participant.id,
          sessionId: participant.session_id,
          displayName: participant.display_name || 'Player',
          roundScore,
          totalScore: participant.total_score || roundScore,
        };
      })
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    const { count: remainingRounds } = await supabase
      .from('battle_room_rounds')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .in('status', ['pending', 'active']);

    if (justClosed) {
      const { question, answers: detailedAnswers } =
        await buildScoreboardDetails({
          supabase,
          roomId,
          roundId: round.id,
        });
      await publishBattleEvent({
        roomId,
        event: 'round_closed',
        payload: {
          roundNo: Number(roundNo),
          scoreboard,
          stage: 'scoreboard',
          generatedAt: new Date().toISOString(),
          hasMoreRounds: !!remainingRounds && remainingRounds > 0,
          question,
          answers: detailedAnswers,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      roundScoreboard: scoreboard,
      finished: false,
    });
  } catch (e: unknown) {
    return createErrorResponse(e);
  }
}
