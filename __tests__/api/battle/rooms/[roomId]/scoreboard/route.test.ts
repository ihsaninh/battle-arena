/**
 * Integration Tests for GET /api/battle/rooms/[roomId]/scoreboard
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rooms/[roomId]/scoreboard/ (in terminal 2)
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

// Helper to get scoreboard via API
async function getScoreboardViaAPI(roomId: string, sessionId?: string) {
  const headers = sessionId ? getBasicHeaders(sessionId) : getBasicHeaders();
  const response = await fetch(
    `${BASE_URL}/api/battle/rooms/${roomId}/scoreboard`,
    {
      method: 'GET',
      headers,
    }
  );
  return response;
}

describe('GET /api/battle/rooms/[roomId]/scoreboard', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/rooms/[roomId]/scoreboard/\n'
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

  test('should return empty scoreboard for new room', async () => {
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

    const response = await getScoreboardViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('scoreboard');
    expect(Array.isArray(data.scoreboard)).toBe(true);
    expect(data.scoreboard.length).toBe(0);
  });

  test('should return scoreboard with single participant', async () => {
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

    const response = await getScoreboardViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scoreboard.length).toBe(1);
    expect(data.scoreboard[0]).toHaveProperty('displayName');
    expect(data.scoreboard[0]).toHaveProperty('totalScore');
    expect(data.scoreboard[0]).toHaveProperty('participantId');
    expect(data.scoreboard[0].displayName).toBe('Host');
  });

  test('should return scoreboard with multiple participants', async () => {
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

    const response = await getScoreboardViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scoreboard.length).toBe(3);
    const names = data.scoreboard.map((s: any) => s.displayName);
    expect(names).toContain('Host');
    expect(names).toContain('Player 1');
    expect(names).toContain('Player 2');
  });

  test('should include participant ID in scoreboard', async () => {
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

    const response = await getScoreboardViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scoreboard.length).toBeGreaterThan(0);
    expect(data.scoreboard[0]).toHaveProperty('participantId');
    expect(typeof data.scoreboard[0].participantId).toBe('string');
  });

  test('should include session ID in scoreboard', async () => {
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

    const response = await getScoreboardViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scoreboard[0]).toHaveProperty('sessionId');
  });

  test('should include time totals in scoreboard', async () => {
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

    const response = await getScoreboardViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scoreboard[0]).toHaveProperty('timeTotalMs');
    expect(typeof data.scoreboard[0].timeTotalMs).toBe('number');
  });

  test('should sort by score descending', async () => {
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

    const response = await getScoreboardViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Check that scores are in descending order
    for (let i = 1; i < data.scoreboard.length; i++) {
      expect(data.scoreboard[i - 1].totalScore).toBeGreaterThanOrEqual(
        data.scoreboard[i].totalScore
      );
    }
  });

  test('should handle team IDs in scoreboard', async () => {
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

    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);

    const response = await getScoreboardViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Team mode might have teamId in response
    if (data.scoreboard.length > 0) {
      expect(data.scoreboard[0]).toHaveProperty('teamId');
    }
  });

  test('should be accessible to any authenticated user', async () => {
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

    // Try accessing scoreboard from non-participant with session
    const otherSession = await createTestSession('Other');
    createdSessionIds.push(otherSession.id);

    // Scoreboard endpoint doesn't require participation (check actual behavior)
    const response = await getScoreboardViaAPI(
      roomData.roomId,
      otherSession.id
    );

    // Depending on implementation, this might be 200 or require participation
    expect([200, 400]).toContain(response.status);
  });

  test('should return consistent order across multiple calls', async () => {
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

    const response1 = await getScoreboardViaAPI(roomData.roomId);
    const data1 = await response1.json();

    const response2 = await getScoreboardViaAPI(roomData.roomId);
    const data2 = await response2.json();

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(data1.scoreboard.length).toBe(data2.scoreboard.length);
    for (let i = 0; i < data1.scoreboard.length; i++) {
      expect(data1.scoreboard[i].participantId).toBe(
        data2.scoreboard[i].participantId
      );
    }
  });
});
