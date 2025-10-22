import { NextRequest, NextResponse } from 'next/server';

import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';

// Define types for better type safety
interface AIQuestion {
  prompt: string;
  difficulty: number;
  language: string;
  category?: string;
  choices?: Array<{ id: string; text: string }>;
  correctChoiceId?: string;
}

export async function GET(
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

    // Get user's answers for this room with round details
    const { data: answers, error: answersErr } = await supabase
      .from('battle_room_answers')
      .select(
        `
        id,
        answer_text,
        choice_id,
        is_correct,
        time_ms,
        score_final,
        feedback,
        round_id,
        battle_room_rounds!inner(
          round_no,
          question_json
        )
      `
      )
      .eq('room_id', roomId)
      .eq('session_id', sessionId);

    if (answersErr) {
      console.error('Failed to fetch user answers:', answersErr);
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Fetch all rounds for this room to ensure unanswered rounds are included
    const { data: rounds, error: roundsErr } = await supabase
      .from('battle_room_rounds')
      .select('id, round_no, question_json')
      .eq('room_id', roomId)
      .order('round_no', { ascending: true });

    if (roundsErr) {
      console.error('Failed to fetch room rounds:', roundsErr);
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    const allRounds = rounds || [];

    type AnswerRecord = NonNullable<typeof answers>[number];

    const answersByRoundId = new Map<string, AnswerRecord>();
    (answers || []).forEach(answer => {
      if (answer.round_id) {
        answersByRoundId.set(answer.round_id, answer);
      }
    });

    const userAnswers = allRounds.map(round => {
      const answer = round.id ? answersByRoundId.get(round.id) : undefined;
      const wasAnswered = !!answer;

      let questionData = null as {
        prompt: string;
        difficulty: number;
        language: string;
        category?: string;
      } | null;

      let answerText = 'No answer submitted';
      let feedback = '';
      let correctAnswer: string | undefined;
      let isCorrect: boolean | undefined;
      let timeMs: number | null = null;

      if (round.question_json) {
        const q = round.question_json as AIQuestion;
        if (q) {
          questionData = {
            prompt: q.prompt,
            difficulty: q.difficulty,
            language: q.language,
            category: q.category,
          };

          if (q.choices && Array.isArray(q.choices)) {
            const choices = q.choices;
            const chosen = choices.find(c => c.id === answer?.choice_id);
            const correct = choices.find(c => c.id === q.correctChoiceId);
            answerText = wasAnswered
              ? chosen?.text || 'No answer submitted'
              : 'No answer submitted';
            const correctText = correct?.text;
            if (correctText !== undefined) {
              correctAnswer = correctText;
            }
            isCorrect = wasAnswered
              ? (answer?.is_correct ??
                (answer?.choice_id && q.correctChoiceId
                  ? answer.choice_id === q.correctChoiceId
                  : false))
              : false;
            timeMs = wasAnswered ? answer?.time_ms || null : null;
          } else if (wasAnswered) {
            answerText = answer?.answer_text || '';
            feedback = answer?.feedback || 'No feedback available';
          }
        }
      } else if (wasAnswered) {
        answerText = answer?.answer_text || '';
        feedback = answer?.feedback || 'No feedback available';
      }

      if (
        !wasAnswered &&
        correctAnswer === undefined &&
        round.question_json?.correctChoiceId
      ) {
        const q = round.question_json as AIQuestion;
        if (q?.choices) {
          const correct = q.choices.find(c => c.id === q.correctChoiceId);
          if (correct?.text !== undefined) {
            correctAnswer = correct.text;
          }
        }
      }

      const score = wasAnswered ? answer?.score_final || 0 : 0;

      return {
        id: wasAnswered
          ? answer!.id
          : `unanswered-${round.id || round.round_no || Math.random()}`,
        roundNo: round.round_no || 0,
        question: questionData,
        answer: answerText,
        score,
        feedback,
        ...(correctAnswer !== undefined
          ? {
              correctAnswer,
              isCorrect: isCorrect ?? false,
              timeMs,
            }
          : {}),
        wasAnswered,
      };
    });

    return NextResponse.json({
      roomId,
      totalAnswers: userAnswers.length,
      answers: userAnswers,
    });
  } catch (error) {
    console.error('Get user answers exception:', error);
    return createErrorResponse(error);
  }
}
