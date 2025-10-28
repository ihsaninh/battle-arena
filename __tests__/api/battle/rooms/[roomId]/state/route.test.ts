/**
 * Integration Tests for GET /api/battle/rooms/[roomId]/state
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rooms/[roomId]/state/ (in terminal 2)
 */

import { describe, test, expect, beforeAll, afterEach } from 'bun:test';
import {
  getTestServerUrl,
  isServerRunning,
} from '../../../../../helpers/test-server';
import {
  cleanupTestSession,
  cleanupTestRoom,
  createTestSession,
} from '../../../../../helpers/test-db';
import {
  createRoomViaAPI,
  joinRoomViaAPI,
  setReadyViaAPI,
  getBasicHeaders,
} from '../../../../../helpers/api-helpers';

const BASE_URL = getTestServerUrl();

// Helper to get room state via API
async function getRoomStateViaAPI(roomId: string, sessionId: string) {
  const response = await fetch(`${BASE_URL}/api/battle/rooms/${roomId}/state`, {
    method: 'GET',
    headers: getBasicHeaders(sessionId),
  });
  return response;
}

describe('GET /api/battle/rooms/[roomId]/state', () => {
  let createdSessionIds: string[] = [];
  let createdRoomIds: string[] = [];

  beforeAll(async () => {
    const running = await isServerRunning();
    if (!running) {
      console.error('\n❌ Test server is not running!\n');
      console.error('📍 Expected server at:', BASE_URL);
      console.error('\n🚀 To run these tests:');
      console.error('   Terminal 1: bun run dev');
      console.error(
        '   Terminal 2: bun test __tests__/api/battle/rooms/[roomId]/state/\n'
      );
      throw new Error(`Test server not running at ${BASE_URL}`);
    }
    console.log('✅ Test server is running at', BASE_URL);
  });

  afterEach(async () => {
    for (const roomId of createdRoomIds) {
      await cleanupTestRoom(roomId);
    }
    createdRoomIds = [];

    for (const sessionId of createdSessionIds) {
      await cleanupTestSession(sessionId);
    }
    createdSessionIds = [];
  });

  test('should return room state for host', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await getRoomStateViaAPI(roomData.roomId, hostSession.id);
    const state = await response.json();

    expect(response.status).toBe(200);
    expect(state).toHaveProperty('room');
    expect(state).toHaveProperty('participants');
    expect(state).toHaveProperty('currentUser');
    expect(state.room.id).toBe(roomData.roomId);
    expect(state.currentUser.is_host).toBe(true);
  });

  test('should return room state for participant', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);

    const response = await getRoomStateViaAPI(
      roomData.roomId,
      playerSession.id
    );
    const state = await response.json();

    expect(response.status).toBe(200);
    expect(state).toHaveProperty('room');
    expect(state).toHaveProperty('participants');
    expect(state).toHaveProperty('currentUser');
    expect(state.currentUser.is_host).toBe(false);
  });

  test('should include all participants in state', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);

    const player1 = await createTestSession('Player 1');
    createdSessionIds.push(player1.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player1.id);

    const player2 = await createTestSession('Player 2');
    createdSessionIds.push(player2.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player2.id);

    const response = await getRoomStateViaAPI(roomData.roomId, hostSession.id);
    const state = await response.json();

    expect(response.status).toBe(200);
    expect(state.participants.length).toBeGreaterThanOrEqual(3);
  });

  test('should include participant ready status', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, playerSession.id, true);

    const response = await getRoomStateViaAPI(
      roomData.roomId,
      playerSession.id
    );
    const state = await response.json();

    expect(response.status).toBe(200);
    const player = state.participants.find(
      (p: any) => p.session_id === playerSession.id
    );
    expect(player).toBeTruthy();
    expect(player.is_ready).toBe(true);
  });

  test('should reject when not participant and not host', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const nonParticipantSession = await createTestSession('Other Player');
    createdSessionIds.push(nonParticipantSession.id);

    const response = await getRoomStateViaAPI(
      roomData.roomId,
      nonParticipantSession.id
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject when no session cookie', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/state`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject for non-existent room', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const response = await getRoomStateViaAPI(
      'non-existent-room-id',
      hostSession.id
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should include room metadata in state', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 60,
        topic: 'History',
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await getRoomStateViaAPI(roomData.roomId, hostSession.id);
    const state = await response.json();

    expect(response.status).toBe(200);
    expect(state.room).toHaveProperty('language');
    expect(state.room).toHaveProperty('num_questions');
    expect(state.room).toHaveProperty('round_time_sec');
    expect(state.room.language).toBe('en');
    expect(state.room.num_questions).toBe(5);
    expect(state.room.round_time_sec).toBe(60);
  });

  test('should include server time for timer synchronization', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await getRoomStateViaAPI(roomData.roomId, hostSession.id);
    const state = await response.json();

    expect(response.status).toBe(200);
    expect(state).toHaveProperty('serverTime');
    expect(typeof state.serverTime).toBe('number');
    expect(state.serverTime).toBeGreaterThan(0);
  });

  test('should include teams data when battle mode is team', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
        battleMode: 'team',
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await getRoomStateViaAPI(roomData.roomId, hostSession.id);
    const state = await response.json();

    expect(response.status).toBe(200);
    expect(state).toHaveProperty('teams');
  });
});
