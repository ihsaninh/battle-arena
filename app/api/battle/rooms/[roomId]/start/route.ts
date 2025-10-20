import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { publishBattleEvent } from '@/src/lib/realtime';
import {
  generateMcqQuestions,
  generateQuestions,
} from '@/src/lib/ai/ai-question-gen';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/session';
import { supabaseAdmin } from '@/src/lib/supabase';

const StartSchema = z.object({ useAI: z.boolean().optional() });

const difficultyToLevel = (value?: string | null) => {
  if (value === 'easy') return 1 as const;
  if (value === 'medium') return 2 as const;
  if (value === 'hard') return 3 as const;
  return undefined;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const body = StartSchema.parse(await req.json().catch(() => ({})));
    const hostSessionId = getBattleSessionIdFromCookies(req);
    if (!hostSessionId) {
      return createErrorResponse(ERROR_TYPES.MISSING_SESSION);
    }
    const supabase = supabaseAdmin();

    // Get additional headers for enhanced host validation
    const hostSessionFromClient = req.headers.get('X-Battle-Host-Session');
    // Load room
    const { data: room, error: roomErr } = await supabase
      .from('battle_rooms')
      .select(
        'id, host_session_id, status, num_questions, category_id, language, round_time_sec, topic, question_type, capacity, difficulty'
      )
      .eq('id', roomId)
      .single();
    if (roomErr || !room) {
      return createErrorResponse(ERROR_TYPES.ROOM_NOT_FOUND);
    }
    if (room.host_session_id !== hostSessionId) {
      // Check if the client claims to be the original host
      if (
        hostSessionFromClient &&
        hostSessionFromClient === room.host_session_id
      ) {
        // Allow the start - client has the original host session
      } else {
        // Additional check: see if the current session belongs to a host participant
        const { data: currentParticipant } = await supabase
          .from('battle_room_participants')
          .select('is_host, display_name')
          .eq('room_id', roomId)
          .eq('session_id', hostSessionId)
          .single();

        if (currentParticipant?.is_host) {
          // Allow the start - this handles the case where session cookies got mixed up
          // but the current user is still a host participant
        } else {
          return createErrorResponse({
            code: 'NOT_HOST',
            message: 'Only the room host can start the battle.',
            retryable: false,
            statusCode: 403,
          });
        }
      }
    }
    if (room.status !== 'waiting') {
      return createErrorResponse({
        code: 'ROOM_ALREADY_STARTED',
        message: 'This battle has already been started.',
        retryable: false,
        statusCode: 400,
      });
    }

    // Check if there are enough participants
    const { data: participants, error: participantsErr } = await supabase
      .from('battle_room_participants')
      .select('id, is_host, is_ready, connection_status, display_name')
      .eq('room_id', roomId);

    if (participantsErr) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    const participantCount = participants?.length || 0;
    const minParticipants = Math.min(2, room.capacity || 2); // At least 2 players, or room capacity if smaller

    if (participantCount < minParticipants) {
      return createErrorResponse({
        code: 'INSUFFICIENT_PARTICIPANTS',
        message: `Need at least ${minParticipants} participants to start the battle. Currently ${participantCount} participant(s) in the room.`,
        retryable: true,
        statusCode: 400,
      });
    }

    const activeParticipants =
      participants?.filter(p => p.connection_status !== 'offline') || [];

    const notReadyParticipants = activeParticipants.filter(
      p => !p.is_host && !p.is_ready
    );

    if (notReadyParticipants.length > 0) {
      const names = notReadyParticipants
        .map(p => p.display_name || 'Participant')
        .join(', ');
      return createErrorResponse({
        code: 'PARTICIPANTS_NOT_READY',
        message: `Some participants aren't ready yet: ${names}.`,
        retryable: true,
        statusCode: 400,
      });
    }

    // Prefer AI generation if enabled; fallback to bank
    let inserts: Array<{
      id: string;
      room_id: string;
      round_no: number;
      question_id: string | null;
      question_json: Record<string, unknown> | null;
      status: 'pending';
    }> = [];
    let usedAI = false;
    let aiError: string | undefined;
    const preferAI = body.useAI ?? process.env.BATTLE_USE_AI === '1';
    const difficultyPreference = difficultyToLevel(room.difficulty);
    if (preferAI) {
      try {
        let categoryName: string | null = null;
        if (room.category_id) {
          const { data: cat } = await supabase
            .from('quiz_categories')
            .select('name')
            .eq('id', room.category_id)
            .single();
          categoryName = cat?.name ?? null;
        }
        if (room.question_type === 'multiple-choice') {
          const aiQs = await generateMcqQuestions({
            topic: room.topic || null,
            categoryName,
            categoryId: room.category_id || null,
            language: room.language,
            num: room.num_questions,
            seed: `${roomId}-${Date.now()}`,
            difficulty: difficultyPreference,
          });
          console.log(aiQs, 'generate');
          if (aiQs.length > 0) {
            console.log(aiQs, 'mcq');
            inserts = aiQs.map((q, idx) => ({
              id: `round-${roomId}-${idx + 1}`,
              room_id: roomId,
              round_no: idx + 1,
              question_id: null,
              question_json: q,
              status: 'pending' as const,
            }));
            usedAI = true;
          }
        } else {
          const aiQs = await generateQuestions({
            topic: room.topic || null,
            categoryName,
            categoryId: room.category_id || null,
            language: room.language,
            num: room.num_questions,
            seed: `${roomId}-${Date.now()}`,
            difficulty: difficultyPreference,
          });
          if (aiQs.length > 0) {
            inserts = aiQs.map((q, idx) => ({
              id: `round-${roomId}-${idx + 1}`,
              room_id: roomId,
              round_no: idx + 1,
              question_id: null,
              question_json: q,
              status: 'pending' as const,
            }));
            usedAI = true;
          }
        }
      } catch (e) {
        console.log(e);
        aiError = (e as Error).message;
      }
    }

    if (inserts.length === 0) {
      // If MCQ is requested but AI failed and no inserts, abort early (no bank fallback for MCQ in MVP)
      if (room.question_type === 'multiple-choice') {
        return createErrorResponse({
          code: 'QUESTION_GENERATION_FAILED',
          message:
            'Failed to generate multiple choice questions. Please try again.',
          retryable: true,
          statusCode: 500,
        });
      }

      let questionsQuery = supabase
        .from('quiz_questions')
        .select('id, prompt, difficulty, rubric_json, language, category_id')
        .eq('is_active', true)
        .eq('language', room.language)
        .order('created_at')
        .limit(room.num_questions);

      if (difficultyPreference !== undefined) {
        questionsQuery = questionsQuery.eq('difficulty', difficultyPreference);
      }

      const initialQuestions = await questionsQuery;
      let questions = initialQuestions.data;
      const qErr = initialQuestions.error;
      if (qErr) {
        return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
      }
      if (
        (!questions || questions.length === 0) &&
        difficultyPreference !== undefined
      ) {
        // Retry without difficulty filter so the battle can still start.
        const retry = await supabase
          .from('quiz_questions')
          .select('id, prompt, difficulty, rubric_json, language, category_id')
          .eq('is_active', true)
          .eq('language', room.language)
          .order('created_at')
          .limit(room.num_questions);
        if (!retry.error) {
          questions = retry.data;
        }
      }
      if (!questions || questions.length === 0) {
        return createErrorResponse({
          code: 'NO_QUESTIONS_AVAILABLE',
          message:
            'No questions are available for the selected language and category.',
          retryable: false,
          statusCode: 400,
        });
      }
      inserts = questions.map((q, idx) => ({
        id: `round-${roomId}-${idx + 1}`,
        room_id: roomId,
        round_no: idx + 1,
        question_id: q.id,
        question_json: null,
        status: 'pending' as const,
      }));
    }
    const { error: rErr } = await supabase
      .from('battle_room_rounds')
      .insert(inserts);
    if (rErr) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Mark room active and set start time
    const { error: updErr } = await supabase
      .from('battle_rooms')
      .update({ status: 'active', start_time: new Date().toISOString() })
      .eq('id', roomId);
    if (updErr) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Reset ready state for next rounds or rematches
    await supabase
      .from('battle_room_participants')
      .update({ is_ready: false })
      .eq('room_id', roomId);

    // Broadcast room started
    await publishBattleEvent({
      roomId,
      event: 'room_started',
      payload: { startTime: new Date().toISOString() },
    });

    // Auto-reveal first round immediately (no artificial delay)
    const now = new Date();
    const deadline = new Date(now.getTime() + room.round_time_sec * 1000);

    const { error: revealErr } = await supabase
      .from('battle_room_rounds')
      .update({
        status: 'active',
        revealed_at: now.toISOString(),
        deadline_at: deadline.toISOString(),
      })
      .eq('room_id', roomId)
      .eq('round_no', 1);

    if (revealErr) {
      // Don't fail the entire start operation, just log the error
      console.error('[START_BATTLE] Failed to reveal first round:', revealErr);
    } else {
      // Broadcast first round revealed immediately
      await publishBattleEvent({
        roomId,
        event: 'round_revealed',
        payload: {
          roundNo: 1,
          revealedAt: now.toISOString(),
          deadlineAt: deadline.toISOString(),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      numRounds: inserts.length,
      roundTimeSec: room.round_time_sec,
      source: usedAI ? 'ai' : 'bank',
      ...(aiError ? { aiError } : {}),
    });
  } catch (e: unknown) {
    return createErrorResponse(e);
  }
}
