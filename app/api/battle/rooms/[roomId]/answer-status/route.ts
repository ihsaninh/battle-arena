import { NextRequest, NextResponse } from 'next/server';

import { publishBattleEvent } from '@/src/lib/client/realtime';
import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { getBattleSessionIdFromCookies } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';

type ParticipantAnswerStatus = {
  session_id: string;
  display_name: string;
  has_answered: boolean;
  is_host: boolean;
  connection_status?: string;
};

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

    const { data: room, error: roomErr } = await supabase
      .from('battle_rooms')
      .select('host_session_id')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return createErrorResponse(ERROR_TYPES.ROOM_NOT_FOUND);
    }

    const { data: membership, error: membershipErr } = await supabase
      .from('battle_room_participants')
      .select('session_id, is_host')
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

    // Get the current active round
    const { data: activeRound } = await supabase
      .from('battle_room_rounds')
      .select('id, round_no')
      .eq('room_id', roomId)
      .eq('status', 'active')
      .order('round_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeRound) {
      return NextResponse.json({
        participants: [],
        currentRound: null,
        totalAnswered: 0,
      });
    }

    // Get all participants in the room
    const { data: participants } = await supabase
      .from('battle_room_participants')
      .select('session_id, display_name, is_host, connection_status, is_ready')
      .eq('room_id', roomId)
      .order('display_name', { ascending: true });

    // Get who has answered this round
    const { data: answers } = await supabase
      .from('battle_room_answers')
      .select('session_id')
      .eq('round_id', activeRound.id);

    const answeredSessionIds = new Set((answers || []).map(a => a.session_id));

    // Combine data to show answer status
    const participantStatus: ParticipantAnswerStatus[] = (
      participants || []
    ).map(p => ({
      session_id: p.session_id,
      display_name: p.display_name,
      has_answered: answeredSessionIds.has(p.session_id),
      is_host: p.is_host,
      connection_status: p.connection_status,
      is_ready: p.is_ready,
    }));

    const activeParticipants = participantStatus.filter(
      p => p.connection_status !== 'offline'
    );

    const totalAnswered = activeParticipants.filter(p => p.has_answered).length;

    const totalParticipants = activeParticipants.length;

    // Check if all active participants have answered and trigger auto-close
    const allAnswered =
      totalParticipants > 0 && totalAnswered === totalParticipants;

    if (allAnswered) {
      // Trigger auto-close event to notify clients
      setTimeout(async () => {
        try {
          await publishBattleEvent({
            roomId,
            event: 'all_participants_answered',
            payload: {
              roundNo: activeRound.round_no,
              totalAnswered,
              totalParticipants,
            },
          });
        } catch (err) {
          console.error(
            'Failed to publish all_participants_answered event:',
            err
          );
        }
      }, 100); // Small delay to ensure response is sent first
    }

    return NextResponse.json({
      participants: participantStatus,
      currentRound: activeRound.round_no,
      totalAnswered,
      totalParticipants,
      allAnswered, // Add this flag for client-side handling
    });
  } catch (error) {
    console.error('Get answer status exception:', error);
    return createErrorResponse(error);
  }
}
