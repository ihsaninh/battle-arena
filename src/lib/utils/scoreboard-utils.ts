import { supabaseAdmin } from '@/src/lib/database/supabase';

type SupabaseClient = ReturnType<typeof supabaseAdmin>;

export interface ScoreboardQuestionSummary {
  prompt: string;
  type: 'multiple-choice' | 'open-ended' | 'unknown';
  correctAnswer?: string | null;
  choices?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  rubricNotes?: string | null;
}

export interface ScoreboardAnswerSummary {
  sessionId: string;
  answerText?: string | null;
  choiceId?: string | null;
  isCorrect?: boolean | null;
}

export async function buildScoreboardDetails(params: {
  supabase: SupabaseClient;
  roomId: string;
  roundId: string;
}): Promise<{
  question: ScoreboardQuestionSummary | null;
  answers: ScoreboardAnswerSummary[];
}> {
  const { supabase, roomId, roundId } = params;

  const { data: answers } = await supabase
    .from('battle_room_answers')
    .select('session_id, answer_text, choice_id, is_correct')
    .eq('round_id', roundId)
    .eq('room_id', roomId);

  const answersSummary: ScoreboardAnswerSummary[] =
    answers?.map(answer => ({
      sessionId: answer.session_id,
      answerText: answer.answer_text ?? null,
      choiceId: answer.choice_id ?? null,
      isCorrect:
        typeof answer.is_correct === 'boolean' ? answer.is_correct : null,
    })) ?? [];

  const { data: roundMeta } = await supabase
    .from('battle_room_rounds')
    .select('question_id, question_json')
    .eq('id', roundId)
    .single();

  if (!roundMeta) {
    return { question: null, answers: answersSummary };
  }

  if (roundMeta.question_json) {
    const q = roundMeta.question_json as {
      prompt?: string;
      choices?: Array<{ id: string; text: string }>;
      correctChoiceId?: string;
      rubric_json?: { notes?: string };
    };

    const isMcq = Array.isArray(q?.choices) && q.choices.length > 0;
    const correctChoice = isMcq
      ? q?.choices?.find(choice => choice.id === q?.correctChoiceId)
      : undefined;

    return {
      question: {
        prompt: q?.prompt ?? "This question's prompt is unavailable.",
        type: isMcq ? 'multiple-choice' : 'open-ended',
        correctAnswer: isMcq
          ? (correctChoice?.text ?? null)
          : (q?.rubric_json?.notes ?? null),
        choices: isMcq
          ? (q?.choices?.map(choice => ({
              id: choice.id,
              text: choice.text,
              isCorrect: choice.id === q?.correctChoiceId,
            })) ?? [])
          : undefined,
        rubricNotes: q?.rubric_json?.notes ?? null,
      },
      answers: answersSummary,
    };
  }

  if (roundMeta.question_id) {
    const { data: bankQuestion } = await supabase
      .from('quiz_questions')
      .select('prompt, rubric_json')
      .eq('id', roundMeta.question_id)
      .maybeSingle();

    const prompt =
      bankQuestion?.prompt ?? "This question's prompt is unavailable.";

    const rubricNotes =
      typeof bankQuestion?.rubric_json === 'object' &&
      bankQuestion?.rubric_json !== null &&
      'notes' in (bankQuestion.rubric_json as Record<string, unknown>)
        ? String((bankQuestion.rubric_json as { notes?: unknown }).notes ?? '')
        : undefined;

    return {
      question: {
        prompt,
        type: rubricNotes ? 'open-ended' : 'unknown',
        correctAnswer: rubricNotes ?? null,
        rubricNotes: rubricNotes ?? null,
      },
      answers: answersSummary,
    };
  }

  return {
    question: {
      prompt: "This question's prompt is unavailable.",
      type: 'unknown',
    },
    answers: answersSummary,
  };
}
