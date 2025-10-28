/**
 * Integration Tests for POST /api/battle/rooms/[roomId]/ready
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/ready.test.ts (in terminal 2)
 */

import { describe, test, expect, beforeAll, afterEach } from 'bun:test';
import { getTestServerUrl, isServerRunning } from '../../helpers/test-server';
import {
  cleanupTestSession,
  cleanupTestRoom,
  createTestSession,
} from '../../helpers/test-db';
import {
  createRoomViaAPI,
  joinRoomViaAPI,
  setReadyViaAPI,
  getBasicHeaders,
} from '../../helpers/api-helpers';

const BASE_URL = getTestServerUrl();

describe('POST /api/battle/rooms/[roomId]/ready', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/ready.test.ts\n'
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

  test('should set player to ready', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);

    const response = await setReadyViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id,
      true
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('ok');
    expect(data.ok).toBe(true);
  });

  test('should set player to not ready', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);

    // First set to ready
    await setReadyViaAPI(BASE_URL, roomData.roomId, playerSession.id, true);

    // Then set to not ready
    const response = await setReadyViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id,
      false
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  test('should handle idempotent ready (same state twice)', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);

    // First ready
    const response1 = await setReadyViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id,
      true
    );
    const data1 = await response1.json();

    // Second ready (same state)
    const response2 = await setReadyViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id,
      true
    );
    const data2 = await response2.json();

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(data2.alreadySet).toBe(true);
  });

  test('should reject ready if not participant', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    // Non-participant tries to set ready
    const otherSession = await createTestSession('Other Player');
    createdSessionIds.push(otherSession.id);

    const response = await setReadyViaAPI(
      BASE_URL,
      roomData.roomId,
      otherSession.id,
      true
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject ready if no session cookie', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    // Try to set ready without session cookie
    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/ready`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ready: true }),
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should handle invalid JSON gracefully', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);

    // Send invalid JSON
    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/ready`,
      {
        method: 'POST',
        headers: getBasicHeaders(playerSession.id),
        body: 'invalid json{',
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should toggle ready status multiple times', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);

    // Toggle multiple times
    for (let i = 0; i < 3; i++) {
      const ready = i % 2 === 0;
      const response = await setReadyViaAPI(
        BASE_URL,
        roomData.roomId,
        playerSession.id,
        ready
      );
      expect(response.status).toBe(200);
    }
  });

  test('should allow multiple players to set ready independently', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
        capacity: 5,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    // Create 3 players
    const players = await Promise.all([
      createTestSession('Player 1'),
      createTestSession('Player 2'),
      createTestSession('Player 3'),
    ]);

    players.forEach(p => createdSessionIds.push(p.id));

    // All join
    for (const player of players) {
      await joinRoomViaAPI(BASE_URL, roomData.roomId, player.id);
    }

    // Each sets ready status independently
    const readyStates = [true, false, true];
    const responses = await Promise.all(
      players.map((p, i) =>
        setReadyViaAPI(BASE_URL, roomData.roomId, p.id, readyStates[i])
      )
    );

    responses.forEach(r => expect(r.status).toBe(200));
  });

  test('should allow host to set ready', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    // Host joins room
    await joinRoomViaAPI(BASE_URL, roomData.roomId, hostSession.id);

    // Host sets ready
    const response = await setReadyViaAPI(
      BASE_URL,
      roomData.roomId,
      hostSession.id,
      true
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  test('should accept ready as boolean true/false', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);

    // Test with true
    const response1 = await setReadyViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id,
      true
    );
    expect(response1.status).toBe(200);

    // Test with false
    const response2 = await setReadyViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id,
      false
    );
    expect(response2.status).toBe(200);
  });
});
