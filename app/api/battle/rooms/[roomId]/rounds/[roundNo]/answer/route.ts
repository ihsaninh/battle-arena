import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { publishBattleEvent } from '@/src/lib/client/realtime';
import { buildScoreboardDetails } from '@/src/lib/utils/scoreboard-utils';
import { evaluateAnswer } from '@/src/lib/ai/ai-scoring';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import {
  answerSubmitLimiter,
  checkRateLimit,
} from '@/src/lib/utils/rate-limit';
import { getBattleSessionIdFromCookies } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';

const AnswerSchema = z.object({ answer_text: z.string().min(1).max(5000) });
const McqAnswerSchema = z.object({ choice_id: z.string().min(1) });

const GRACE_MS = 3000; // small grace to tolerate minor clock drift

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string; roundNo: string }> }
) {
  try {
    // Check rate limit for answer submissions
    const rateLimit = checkRateLimit(req, answerSubmitLimiter);
    if (rateLimit.limited) {
      return rateLimit.response!;
    }

    const { roomId, roundNo } = await context.params;
    const raw = await req.json();
    const sessionId = getBattleSessionIdFromCookies(req);
    if (!sessionId) {
      return createErrorResponse(ERROR_TYPES.MISSING_SESSION);
    }
    const supabase = supabaseAdmin();

    // Load round and check status/deadline
    const { data: round, error: roundErr } = await supabase
      .from('battle_room_rounds')
      .select('id, status, deadline_at, question_id, question_json')
      .eq('room_id', roomId)
      .eq('round_no', Number(roundNo))
      .single();
    if (roundErr || !round)
      return createErrorResponse(ERROR_TYPES.ROUND_NOT_FOUND);
    if (round.status !== 'active')
      return createErrorResponse(ERROR_TYPES.ROUND_NOT_ACTIVE);
    if (
      round.deadline_at &&
      Date.now() > new Date(round.deadline_at).getTime() + GRACE_MS
    ) {
      console.log(
        `[DEBUG] Deadline check failed: client_time=${Date.now()}, server_deadline=${new Date(
          round.deadline_at
        ).getTime()}, grace=${GRACE_MS}`
      );
      return createErrorResponse(ERROR_TYPES.DEADLINE_PASSED);
    }

    // Ensure participant is in room
    const { data: part, error: partErr } = await supabase
      .from('battle_room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('session_id', sessionId)
      .single();
    if (partErr || !part)
      return createErrorResponse(ERROR_TYPES.NOT_PARTICIPANT);

    // Determine question type for this room
    const { data: room } = await supabase
      .from('battle_rooms')
      .select('question_type, round_time_sec')
      .eq('id', roomId)
      .single();
    const isMcq = (room?.question_type || 'open-ended') === 'multiple-choice';

    if (isMcq) {
      // MCQ submission path
      const body = McqAnswerSchema.parse(raw);

      const qJson = round.question_json as
        | (Record<string, unknown> & {
            choices?: Array<{ id: string; text: string }>;
            correctChoiceId?: string;
          })
        | null;
      if (!qJson || !qJson.choices || !qJson.correctChoiceId) {
        return NextResponse.json(
          { error: 'MCQ data not available for this round' },
          { status: 400 }
        );
      }

      const correct = body.choice_id === qJson.correctChoiceId;

      // Compute time elapsed from reveal
      const { data: reveal } = await supabase
        .from('battle_room_rounds')
        .select('revealed_at')
        .eq('id', round.id)
        .single();
      const revealedAt = reveal?.revealed_at
        ? new Date(reveal.revealed_at).getTime()
        : Date.now();
      const now = Date.now();
      const timeMs = Math.max(0, now - revealedAt);
      console.log(
        `[DEBUG] Time calculation: revealedAt=${revealedAt}, now=${now}, timeMs=${timeMs}`
      );

      const tMaxMs = Math.max(1, (room?.round_time_sec || 60) * 1000);
      // Keep scores within 0..100 per DB constraint
      // If correct: base 60 + time bonus up to 40. If wrong: 0
      const base = correct ? 60 : 0;
      const timeBonus = correct
        ? Math.floor(((tMaxMs - Math.min(timeMs, tMaxMs)) / tMaxMs) * 40)
        : 0;
      const finalScore = Math.max(0, Math.min(100, base + timeBonus));

      const id = `ans-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { error: ansErr } = await supabase
        .from('battle_room_answers')
        .insert({
          id,
          room_id: roomId,
          round_id: round.id,
          session_id: sessionId,
          answer_text: '',
          choice_id: body.choice_id,
          is_correct: correct,
          time_ms: timeMs,
          score_ai: null,
          score_rule: finalScore,
          score_final: finalScore,
          feedback: null,
        });
      if (ansErr) {
        if ((ansErr as Error & { code?: string }).code === '23505') {
          return NextResponse.json(
            { error: 'Already answered' },
            { status: 409 }
          );
        }
        console.error('Answer insert error:', ansErr);
        return NextResponse.json(
          { error: 'Failed to store answer' },
          { status: 500 }
        );
      }

      // Broadcast and maybe auto-advance
      after(async () => {
        await publishBattleEvent({
          roomId,
          event: 'answer_received',
          payload: { roundNo: Number(roundNo), participantId: part.id },
        });
      });

      const autoAdvanceEnabled = process.env.BATTLE_AUTO_ADVANCE !== 'false';
      if (autoAdvanceEnabled) {
        after(() =>
          checkAndAutoAdvanceRound(roomId, round.id, Number(roundNo))
        );
      }

      return NextResponse.json({ score: finalScore, correct });
    }

    // Fetch question for evaluation (open-ended)
    const body = AnswerSchema.parse(raw);
    let question: {
      prompt: string;
      difficulty: number;
      rubric_json: Record<string, unknown> | null;
      language: string;
      category: string;
    } = {
      prompt: '',
      difficulty: 2,
      rubric_json: null,
      language: 'en',
      category: 'tech',
    };
    if (round.question_id) {
      const { data: q, error: qErr } = await supabase
        .from('quiz_questions')
        .select('prompt, difficulty, rubric_json, language, category_id')
        .eq('id', round.question_id)
        .single();
      if (qErr || !q)
        return NextResponse.json(
          { error: 'Question missing' },
          { status: 500 }
        );
      question = {
        prompt: q.prompt,
        difficulty: q.difficulty ?? 2,
        rubric_json: q.rubric_json,
        language: q.language ?? 'en',
        category: q.category_id ?? 'tech',
      };
    } else if (round.question_json) {
      const q = round.question_json as Record<string, unknown>;
      question = {
        prompt: (q.prompt as string) ?? '',
        difficulty: (q.difficulty as number) ?? 2,
        rubric_json: (q.rubric_json as Record<string, unknown>) ?? null,
        language: (q.language as string) ?? 'en',
        category: (q.category as string) ?? 'tech',
      };
    }

    // Evaluate answer (AI with fallback inside evaluator)
    const ai = await evaluateAnswer({
      question: question.prompt,
      answer: body.answer_text,
      category: question.category,
      difficulty: Number(question.difficulty ?? 2),
      language: question.language,
      rubric: question.rubric_json ?? undefined,
    });

    // Insert answer
    const id = `ans-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { error: ansErr } = await supabase
      .from('battle_room_answers')
      .insert({
        id,
        room_id: roomId,
        round_id: round.id,
        session_id: sessionId,
        answer_text: body.answer_text,
        score_ai: ai.score,
        score_rule: null,
        score_final: ai.score,
        feedback: ai.feedback,
      });
    if (ansErr) {
      if ((ansErr as Error & { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'Already answered' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to store answer' },
        { status: 500 }
      );
    }

    // Broadcast answer_received in background (notify other clients)
    after(async () => {
      await publishBattleEvent({
        roomId,
        event: 'answer_received',
        payload: { roundNo: Number(roundNo), participantId: part.id },
      });
    });

    // Check if all participants have answered for auto-advance
    const autoAdvanceEnabled = process.env.BATTLE_AUTO_ADVANCE !== 'false';
    if (autoAdvanceEnabled) {
      // Run auto-advance in the background so the response isn't delayed
      after(() => checkAndAutoAdvanceRound(roomId, round.id, Number(roundNo)));
    }

    return NextResponse.json({ score: ai.score, feedback: ai.feedback });
  } catch (e: unknown) {
    return createErrorResponse(e);
  }
}

/**
 * Check if all participants have answered and auto-advance to next round
 * Uses atomic operations to prevent race conditions
 */
async function checkAndAutoAdvanceRound(
  roomId: string,
  roundId: string,
  roundNo: number
) {
  const supabase = supabaseAdmin();

  try {
    // Use RPC function for atomic round closure and score updates
    const { data: result, error: rpcError } = await supabase.rpc(
      'close_round_and_update_scores',
      {
        p_round_id: roundId,
        p_room_id: roomId,
      }
    );

    if (rpcError) {
      console.error('[DEBUG] RPC error in auto-advance:', rpcError);
      // Fallback to original logic if RPC fails
      return await checkAndAutoAdvanceRoundFallback(roomId, roundId, roundNo);
    }

    if (!result || !result.round_closed) {
      return; // Round was already handled
    }

    const { data: answers } = await supabase
      .from('battle_room_answers')
      .select('session_id, score_final')
      .eq('round_id', roundId);

    const { data: participants } = await supabase
      .from('battle_room_participants')
      .select('id, session_id, display_name, total_score')
      .eq('room_id', roomId);

    const roundScores = new Map(
      (answers || []).map(a => [a.session_id, a.score_final || 0])
    );

    const roundScoreboard = (participants || [])
      .map(participant => {
        const roundScore = roundScores.get(participant.session_id) || 0;
        return {
          sessionId: participant.session_id,
          displayName: participant.display_name || 'Player',
          participantId: participant.id,
          roundScore,
          totalScore: participant.total_score || roundScore,
        };
      })
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    const { count: remainingRounds } = await supabase
      .from('battle_room_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .in('status', ['pending', 'active']);

    const { question, answers: detailedAnswers } = await buildScoreboardDetails(
      {
        supabase,
        roomId,
        roundId,
      }
    );

    await publishBattleEvent({
      roomId,
      event: 'round_closed',
      payload: {
        roundNo,
        scoreboard: roundScoreboard,
        stage: 'scoreboard',
        generatedAt: new Date().toISOString(),
        reason: 'all_answered',
        hasMoreRounds: !!remainingRounds && remainingRounds > 0,
        question,
        answers: detailedAnswers,
      },
    });
  } catch (error) {
    console.error('[DEBUG] Error in checkAndAutoAdvanceRound:', error);
  }
}

/**
 * Fallback function for auto-advance when RPC is not available
 */
async function checkAndAutoAdvanceRoundFallback(
  roomId: string,
  roundId: string,
  roundNo: number
) {
  const supabase = supabaseAdmin();

  try {
    // First, check if the round is still active (not already closed by another request)
    const { data: currentRound } = await supabase
      .from('battle_room_rounds')
      .select('status')
      .eq('id', roundId)
      .single();

    if (!currentRound || currentRound.status !== 'active') {
      return;
    }

    // Get total participants in the room
    const { count: totalParticipants } = await supabase
      .from('battle_room_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    // Get total answers for this round
    const { count: totalAnswers } = await supabase
      .from('battle_room_answers')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', roundId);

    // If everyone has answered, auto-close the round
    if (
      totalParticipants &&
      totalAnswers &&
      totalAnswers >= totalParticipants
    ) {
      // Close the current round atomically
      const { data: closedRound, error: closeError } = await supabase
        .from('battle_room_rounds')
        .update({ status: 'scoreboard' })
        .eq('id', roundId)
        .eq('status', 'active') // Only close if still active
        .select('status')
        .single();

      if (closeError || !closedRound) {
        return;
      }

      // Get answers for scoreboard
      const { data: answers } = await supabase
        .from('battle_room_answers')
        .select('session_id, score_final')
        .eq('round_id', roundId);

      // Update participant totals with atomic increments
      if (answers && answers.length > 0) {
        // Use individual updates with retry logic to handle race conditions
        for (const a of answers) {
          if (a.score_final && a.score_final > 0) {
            await updateParticipantScoreAtomic(
              supabase,
              roomId,
              a.session_id,
              a.score_final
            );
          }
        }
      }

      // Prepare scoreboard for broadcast
      const { data: participants } = await supabase
        .from('battle_room_participants')
        .select('id, session_id, display_name, total_score')
        .eq('room_id', roomId);

      const roundScores = new Map(
        (answers || []).map(a => [a.session_id, a.score_final || 0])
      );

      const roundScoreboard = (participants || [])
        .map(participant => {
          const roundScore = roundScores.get(participant.session_id) || 0;
          return {
            sessionId: participant.session_id,
            displayName: participant.display_name || 'Player',
            participantId: participant.id,
            roundScore,
            totalScore: participant.total_score || roundScore,
          };
        })
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

      const { count: remainingRounds } = await supabase
        .from('battle_room_rounds')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .in('status', ['pending', 'active']);

      const { question, answers: detailedAnswers } =
        await buildScoreboardDetails({
          supabase,
          roomId,
          roundId,
        });

      await publishBattleEvent({
        roomId,
        event: 'round_closed',
        payload: {
          roundNo,
          scoreboard: roundScoreboard,
          reason: 'all_answered',
          stage: 'scoreboard',
          generatedAt: new Date().toISOString(),
          hasMoreRounds: !!remainingRounds && remainingRounds > 0,
          question,
          answers: detailedAnswers,
        },
      });
    }
  } catch {}
}

/**
 * Atomically update participant score with retry logic to handle race conditions
 */
async function updateParticipantScoreAtomic(
  supabase: ReturnType<typeof supabaseAdmin>,
  roomId: string,
  sessionId: string,
  scoreIncrement: number,
  maxRetries: number = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Use raw SQL for atomic increment
      const { error } = await supabase.rpc('increment_participant_score', {
        p_room_id: roomId,
        p_session_id: sessionId,
        p_score_increment: scoreIncrement,
      });

      if (!error) {
        return; // Success
      }

      // If RPC doesn't exist, fallback to conditional update
      const { data: current } = await supabase
        .from('battle_room_participants')
        .select('total_score')
        .eq('room_id', roomId)
        .eq('session_id', sessionId)
        .single();

      if (current) {
        const newScore = (current.total_score || 0) + scoreIncrement;
        const { error: updateError } = await supabase
          .from('battle_room_participants')
          .update({ total_score: newScore })
          .eq('room_id', roomId)
          .eq('session_id', sessionId)
          .eq('total_score', current.total_score); // Optimistic locking

        if (!updateError) {
          return; // Success
        }
      }

      // If we get here, there was a conflict, retry after a short delay
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
      }
    } catch (error) {
      console.error(
        `[DEBUG] Score update attempt ${attempt + 1} failed:`,
        error
      );
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }
  }

  console.error(
    `[DEBUG] Failed to update score for session ${sessionId} after ${maxRetries} attempts`
  );
}
