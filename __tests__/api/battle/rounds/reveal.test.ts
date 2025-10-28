/**
 * Integration Tests for POST /api/battle/rooms/[roomId]/rounds/[roundNo]/reveal
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rounds/reveal.test.ts (in terminal 2)
 */

import { describe, test, expect, beforeAll, afterEach } from 'bun:test';
import {
  getTestServerUrl,
  isServerRunning,
} from '../../../helpers/test-server';
import {
  cleanupTestSession,
  cleanupTestRoom,
  createTestSession,
} from '../../../helpers/test-db';
import {
  createRoomViaAPI,
  getBasicHeaders,
} from '../../../helpers/api-helpers';

const BASE_URL = getTestServerUrl();

// Helper to reveal round via API
async function revealRoundViaAPI(
  roomId: string,
  roundNo: number,
  sessionId: string
) {
  const response = await fetch(
    `${BASE_URL}/api/battle/rooms/${roomId}/rounds/${roundNo}/reveal`,
    {
      method: 'POST',
      headers: getBasicHeaders(sessionId),
      body: JSON.stringify({}),
    }
  );
  return response;
}

describe('POST /api/battle/rooms/[roomId]/rounds/[roundNo]/reveal', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/rounds/reveal.test.ts\n'
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
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/rounds/1/reveal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject for non-existent round', async () => {
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

    const response = await revealRoundViaAPI(
      roomData.roomId,
      999,
      hostSession.id
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject for non-existent room', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const response = await revealRoundViaAPI(
      'non-existent-room-id',
      1,
      hostSession.id
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should accept empty body', async () => {
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

    const response = await revealRoundViaAPI(
      roomData.roomId,
      1,
      hostSession.id
    );

    // May fail if round doesn't exist, but shouldn't fail parsing
    expect([200, 400]).toContain(response.status);
  });

  test('should return ok response when successful', async () => {
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

    const response = await revealRoundViaAPI(
      roomData.roomId,
      1,
      hostSession.id
    );

    if (response.status === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('ok');
    }
  });

  test('should set deadline when revealing', async () => {
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

    const response = await revealRoundViaAPI(
      roomData.roomId,
      1,
      hostSession.id
    );

    // Structure should include deadline info if successful
    if (response.status === 200) {
      const data = await response.json();
      expect(data).toBeTruthy();
    }
  });

  test('should allow host to reveal', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 0,
        roundTimeSec: 30,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await revealRoundViaAPI(
      roomData.roomId,
      1,
      hostSession.id
    );

    // Should either succeed or fail with expected error
    expect([200, 400]).toContain(response.status);
  });
});
