import { NextRequest, NextResponse } from 'next/server';

import { createErrorResponse, ERROR_TYPES } from '@/src/lib/api/api-errors';
import { checkRateLimit, generalLimiter } from '@/src/lib/utils/rate-limit';
import { getBattleSessionIdFromCookies } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';
import { createRoomSchema, validateRequest } from '@/src/lib/utils/validation';

// Simple in-memory connection tracking for server-side
const serverConnections = new Map<
  string,
  { roomId: string; timestamp: number }
>();

// Helper function to check if room code is already taken
async function isRoomCodeTaken(
  supabase: ReturnType<typeof supabaseAdmin>,
  roomCode: string
): Promise<boolean> {
  const { data } = await supabase
    .from('battle_rooms')
    .select('id')
    .eq('room_code', roomCode)
    .single();
  return !!data;
}

function trackServerConnection(roomId: string, sessionId: string) {
  serverConnections.set(sessionId, {
    roomId,
    timestamp: Date.now(),
  });

  // Clean up old connections (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, conn] of serverConnections.entries()) {
    if (conn.timestamp < oneHourAgo) {
      serverConnections.delete(key);
    }
  }

  console.log(
    `🖥️ Server connection tracked. Active connections: ${serverConnections.size}`
  );
}

export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(req, generalLimiter);
    if (rateLimit.limited) {
      return rateLimit.response!;
    }

    const json = await req.json();

    // Validate request body
    const validation = validateRequest(createRoomSchema, json);
    if (!validation.success) {
      return createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid room creation data',
        details: validation.details,
        retryable: false,
        statusCode: 400,
      });
    }

    const body = validation.data;

    const supabase = supabaseAdmin();
    const hostSessionId = getBattleSessionIdFromCookies(req);
    if (!hostSessionId) {
      return createErrorResponse(ERROR_TYPES.MISSING_SESSION);
    }

    // Track server connection
    trackServerConnection(`temp-${Date.now()}`, hostSessionId);

    // Ensure host session exists
    const { data: session, error: sessionErr } = await supabase
      .from('battle_sessions')
      .select('*')
      .eq('id', hostSessionId)
      .single();

    if (sessionErr || !session) {
      console.error(
        'Session lookup error:',
        sessionErr,
        'for sessionId:',
        hostSessionId
      );
      console.log(
        `[DEBUG] RLS check: session lookup failed for ${hostSessionId}`
      );
      return createErrorResponse(ERROR_TYPES.INVALID_SESSION);
    }
    console.log(
      `[DEBUG] RLS check: session lookup succeeded for ${hostSessionId}`
    );

    const roomId = `room-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    // Generate unique short room code
    let roomCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      attempts++;
    } while (
      attempts < maxAttempts &&
      (await isRoomCodeTaken(supabase, roomCode))
    );

    if (attempts >= maxAttempts) {
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // Create room
    const { error: roomErr } = await supabase.from('battle_rooms').insert({
      id: roomId,
      room_code: roomCode,
      host_session_id: hostSessionId,
      topic: body.topic ?? null,
      category_id: body.categoryId ?? null,
      language: body.language,
      num_questions: body.numQuestions,
      round_time_sec: body.roundTimeSec,
      capacity: body.capacity ?? null,
      question_type: body.questionType ?? 'open-ended',
      difficulty: body.difficulty ?? null,
      battle_mode: body.battleMode ?? 'individual',
      status: 'waiting',
    });

    if (roomErr) {
      console.error('Create room error', roomErr);
      return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    }

    // If team mode, create 2 teams (Red and Blue)
    if (body.battleMode === 'team') {
      const teams = [
        {
          id: `${roomId}-team-red`,
          room_id: roomId,
          team_name: 'Red Team',
          team_color: '#EF4444',
          team_order: 0,
          total_score: 0,
        },
        {
          id: `${roomId}-team-blue`,
          room_id: roomId,
          team_name: 'Blue Team',
          team_color: '#3B82F6',
          team_order: 1,
          total_score: 0,
        },
      ];

      const { error: teamsErr } = await supabase
        .from('battle_teams')
        .insert(teams);

      if (teamsErr) {
        console.error('Create teams error', teamsErr);
        // Rollback room creation
        await supabase.from('battle_rooms').delete().eq('id', roomId);
        return createErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
      }

      console.log(`✅ Created 2 teams for room ${roomId}`);
    }

    // Update connection tracking with actual room ID
    trackServerConnection(roomId, hostSessionId);

    // Room created successfully - host will join manually
    return NextResponse.json({ roomId, roomCode });
  } catch (e: unknown) {
    console.error('Create room exception', e);
    return createErrorResponse(e);
  }
}
