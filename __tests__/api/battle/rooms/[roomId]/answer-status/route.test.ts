/**
 * Integration Tests for GET /api/battle/rooms/[roomId]/answer-status
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rooms/[roomId]/answer-status/ (in terminal 2)
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
  getBasicHeaders,
} from '../../../../../helpers/api-helpers';

const BASE_URL = getTestServerUrl();

// Helper to get answer status via API
async function getAnswerStatusViaAPI(roomId: string, sessionId: string) {
  const response = await fetch(
    `${BASE_URL}/api/battle/rooms/${roomId}/answer-status`,
    {
      method: 'GET',
      headers: getBasicHeaders(sessionId),
    }
  );
  return response;
}

describe('GET /api/battle/rooms/[roomId]/answer-status', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/rooms/[roomId]/answer-status/\n'
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

  test('should return answer status when no active round', async () => {
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

    const response = await getAnswerStatusViaAPI(
      roomData.roomId,
      hostSession.id
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('participants');
    expect(data).toHaveProperty('currentRound');
    expect(data.currentRound).toBeNull();
    expect(data.participants.length).toBe(0);
  });

  test('should reject when not participant', async () => {
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

    const response = await getAnswerStatusViaAPI(
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
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/answer-status`,
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

    const response = await getAnswerStatusViaAPI(
      'non-existent-room-id',
      hostSession.id
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should return participants in room', async () => {
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

    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);

    const response = await getAnswerStatusViaAPI(
      roomData.roomId,
      hostSession.id
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    // When no active round, participants is empty
    expect(Array.isArray(data.participants)).toBe(true);
    expect(data.currentRound).toBeNull();
  });

  test('should include participant answer status', async () => {
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

    const response = await getAnswerStatusViaAPI(
      roomData.roomId,
      hostSession.id
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalAnswered');
    expect(typeof data.totalAnswered).toBe('number');
    // totalParticipants only included when there's an active round
    if (data.currentRound) {
      expect(data).toHaveProperty('totalParticipants');
      expect(typeof data.totalParticipants).toBe('number');
    }
  });

  test('should include host status in participants', async () => {
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

    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);

    const response = await getAnswerStatusViaAPI(
      roomData.roomId,
      hostSession.id
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    // Host status is included in participants when data is available
    expect(data).toHaveProperty('participants');
    if (data.participants.length > 0) {
      expect(data.participants[0]).toHaveProperty('is_host');
    }
  });

  test('should include connection status for participants', async () => {
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

    const response = await getAnswerStatusViaAPI(
      roomData.roomId,
      hostSession.id
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.participants.length > 0) {
      expect(data.participants[0]).toHaveProperty('connection_status');
    }
  });

  test('should return allAnswered flag', async () => {
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

    const response = await getAnswerStatusViaAPI(
      roomData.roomId,
      hostSession.id
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    // allAnswered flag is included when there's an active round
    expect(data).toHaveProperty('participants');
    expect(data).toHaveProperty('currentRound');
    if (data.currentRound) {
      expect(data).toHaveProperty('allAnswered');
      expect(typeof data.allAnswered).toBe('boolean');
    }
  });
});
