/**
 * Integration Tests for POST /api/battle/rooms/[roomId]/start
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rooms/[roomId]/start/ (in terminal 2)
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

// Helper to start battle via API
async function startBattleViaAPI(
  roomId: string,
  sessionId: string,
  useAI?: boolean
) {
  const response = await fetch(`${BASE_URL}/api/battle/rooms/${roomId}/start`, {
    method: 'POST',
    headers: getBasicHeaders(sessionId),
    body: JSON.stringify({ useAI }),
  });
  return response;
}

describe('POST /api/battle/rooms/[roomId]/start', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/rooms/[roomId]/start/\n'
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

  test.skip('should start battle with minimum participants', async () => {
    // Skipped: Takes too long due to question generation and timers
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 1,
        roundTimeSec: 5,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, player.id, true);

    const response = await startBattleViaAPI(roomData.roomId, hostSession.id);
    const data = await response.json();

    expect(response.status).toBe(200);
  });

  test('should reject start if not host', async () => {
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

    // Both join
    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, player.id, true);

    // Player tries to start (not host)
    const response = await startBattleViaAPI(roomData.roomId, player.id);

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject start if no session cookie', async () => {
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
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject start if insufficient participants', async () => {
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

    // Only host joins
    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    // Try to start with only 1 participant
    const response = await startBattleViaAPI(roomData.roomId, hostSession.id);

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject start if participants not ready', async () => {
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

    // Host joins and ready
    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    // Player joins but NOT ready
    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
    // Note: NOT calling setReadyViaAPI

    const response = await startBattleViaAPI(roomData.roomId, hostSession.id);

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject start if room not found', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const response = await startBattleViaAPI(
      'non-existent-room',
      hostSession.id
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject start if room already started', async () => {
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

    // Host joins
    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    // Player joins and ready
    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, player.id, true);

    // Start first time
    const response1 = await startBattleViaAPI(roomData.roomId, hostSession.id);
    expect(response1.status).toBe(200);

    // Try to start again
    const response2 = await startBattleViaAPI(roomData.roomId, hostSession.id);
    expect(response2.status).toBeGreaterThanOrEqual(400);
  });

  test.skip('should handle multiple players ready', async () => {
    // Skipped: Takes too long due to question generation and timers
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
        capacity: 4,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    const players = await Promise.all([
      createTestSession('Player 1'),
      createTestSession('Player 2'),
      createTestSession('Player 3'),
    ]);

    for (const player of players) {
      createdSessionIds.push(player.id);
      await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
      await setReadyViaAPI(BASE_URL, roomData.roomId, player.id, true);
    }

    const response = await startBattleViaAPI(roomData.roomId, hostSession.id);
    const data = await response.json();

    expect(response.status).toBe(200);
  });

  test('should accept useAI parameter', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 2,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    // Host joins
    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    // Player joins and ready
    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, player.id, true);

    const response = await startBattleViaAPI(
      roomData.roomId,
      hostSession.id,
      true
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  test('should return source (ai or bank) in response', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 2,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    // Host joins
    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    // Player joins and ready
    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, player.id, true);

    const response = await startBattleViaAPI(roomData.roomId, hostSession.id);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('source');
    expect(['ai', 'bank']).toContain(data.source);
  });

  test('should return roundTimeSec in response', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 2,
        roundTimeSec: 45,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    // Host joins
    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, hostSession.id, true);

    // Player joins and ready
    const player = await createTestSession('Player 1');
    createdSessionIds.push(player.id);
    await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
    await setReadyViaAPI(BASE_URL, roomData.roomId, player.id, true);

    const response = await startBattleViaAPI(roomData.roomId, hostSession.id);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.roundTimeSec).toBe(45);
  });
});
