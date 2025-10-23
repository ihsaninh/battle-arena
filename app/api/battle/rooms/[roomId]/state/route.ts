import { NextRequest, NextResponse } from 'next/server';

import type { ApiParticipant } from '@/src/types/battle';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';

type QuestionSummary = {
  prompt: string;
  difficulty: number;
  language: string;
  category?: string;
  // Optional for MCQ
  choices?: Array<{ id: string; text: string }>;
} | null;

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

    // Get room info with capacity and battle_mode
    const { data: room, error: roomErr } = await supabase
      .from('battle_rooms')
      .select(
        'id, topic, category_id, language, num_questions, round_time_sec, status, start_time, capacity, question_type, room_code, host_session_id, difficulty, battle_mode'
      )
      .eq('id', roomId)
      .single();
    if (roomErr || !room)
      return createErrorResponse(ERROR_TYPES.ROOM_NOT_FOUND);

    const { data: membership, error: membershipErr } = await supabase
      .from('battle_room_participants')
      .select(
        'id, session_id, display_name, is_host, connection_status, total_score'
      )
      .eq('room_id', roomId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (membershipErr && membershipErr.code !== 'PGRST116') {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    const isHostSession = room.host_session_id === sessionId;

    if (!isHostSession && !membership) {
      return createErrorResponse(ERROR_TYPES.NOT_PARTICIPANT);
    }

    let hostDisplayName: string | null = null;
    if (isHostSession && !membership) {
      const { data: hostSession } = await supabase
        .from('battle_sessions')
        .select('display_name')
        .eq('id', sessionId)
        .maybeSingle();
      hostDisplayName = hostSession?.display_name ?? null;
    }

    // Get participants with session_id and team_id for proper mapping
    // Order by participant ID to maintain consistent ordering
    const { data: participants } = await supabase
      .from('battle_room_participants')
      .select(
        'id, session_id, display_name, is_host, connection_status, total_score, joined_at, last_seen_at, is_ready, team_id'
      )
      .eq('room_id', roomId)
      .order('id', { ascending: true }); // Use participant ID for consistent ordering

    // Get teams if battle mode is team
    let teams = null;
    if (room.battle_mode === 'team') {
      const { data: teamsData } = await supabase
        .from('battle_teams')
        .select('id, room_id, team_name, team_color, team_order, total_score')
        .eq('room_id', roomId)
        .order('team_order', { ascending: true });
      teams = teamsData || [];
    }
    // Build current user response from membership or host session
    let currentUser = null;
    if (membership) {
      currentUser = {
        session_id: membership.session_id,
        display_name: membership.display_name,
        is_host: membership.is_host,
        total_score: membership.total_score,
      };
    } else if (isHostSession) {
      currentUser = {
        session_id: sessionId,
        display_name: hostDisplayName,
        is_host: true,
        total_score: 0,
      };
    }

    // Active round snapshot (if any)
    const { data: round } = await supabase
      .from('battle_room_rounds')
      .select('round_no, revealed_at, deadline_at, status, question_json')
      .eq('room_id', roomId)
      .in('status', ['active', 'scoreboard'])
      .order('round_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    let questionSummary: QuestionSummary = null;
    if (round && round.revealed_at && round.question_json) {
      const q = round.question_json as {
        prompt: string;
        difficulty: number;
        language: string;
        category?: string;
        choices?: Array<{ id: string; text: string }>;
        correctChoiceId?: string;
      };
      questionSummary = {
        prompt: q.prompt,
        difficulty: q.difficulty,
        language: q.language,
        category: q.category,
        choices: q.choices?.map(c => ({ id: c.id, text: c.text })),
      };
    }

    return NextResponse.json({
      room,
      participants: (participants || []).map((p: ApiParticipant) => ({
        session_id: p.session_id, // Include session_id for host detection
        display_name: p.display_name,
        is_host: p.is_host,
        connection_status: p.connection_status,
        total_score: p.total_score,
        participantId: p.id, // Keep participantId for UI
        joined_at: p.joined_at,
        last_seen_at: p.last_seen_at,
        is_ready: p.is_ready,
        team_id: p.team_id, // Include team assignment
      })),
      teams, // Include teams data if battle mode is team
      currentUser, // Include current user info for host detection
      activeRound: round
        ? {
            roundNo: round.round_no,
            revealedAt: round.revealed_at,
            deadlineAt: round.deadline_at,
            status: round.status,
            question: questionSummary, // includes choices for MCQ (without correct id)
          }
        : null,
      serverTime: Date.now(), // Include server time for accurate client timer
    });
  } catch (e: unknown) {
    return createErrorResponse(e);
  }
}
