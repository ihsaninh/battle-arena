/**
 * Integration Tests for POST /api/battle/rooms/[roomId]/presence
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rooms/[roomId]/presence/ (in terminal 2)
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

describe('POST /api/battle/rooms/[roomId]/presence', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/rooms/[roomId]/presence/\n'
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

  test('should update presence status to offline', async () => {
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

    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/presence`,
      {
        method: 'POST',
        headers: getBasicHeaders(playerSession.id),
        body: JSON.stringify({ status: 'offline' }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('ok');
    expect(data.ok).toBe(true);
  });

  test('should update presence status to online', async () => {
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

    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/presence`,
      {
        method: 'POST',
        headers: getBasicHeaders(playerSession.id),
        body: JSON.stringify({ status: 'online' }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  test('should reject presence update when not a participant', async () => {
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

    const nonParticipantSession = await createTestSession('Non-Participant');
    createdSessionIds.push(nonParticipantSession.id);

    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/presence`,
      {
        method: 'POST',
        headers: getBasicHeaders(nonParticipantSession.id),
        body: JSON.stringify({ status: 'offline' }),
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject presence update when no session cookie', async () => {
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

    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/presence`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'offline' }),
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
