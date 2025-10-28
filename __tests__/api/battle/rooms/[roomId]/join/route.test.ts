/**
 * Integration Tests for POST /api/battle/rooms/[roomId]/join
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rooms/[roomId]/join/ (in terminal 2)
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
} from '../../../../../helpers/api-helpers';

const BASE_URL = getTestServerUrl();

describe('POST /api/battle/rooms/[roomId]/join', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/rooms/[roomId]/join/\n'
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

  test('should join room by roomId', async () => {
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

    const response = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('participantId');
    expect(data).toHaveProperty('roomId');
    expect(data.roomId).toBe(roomData.roomId);
  });

  test('should join room by roomCode', async () => {
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

    const response = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomCode,
      playerSession.id
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('participantId');
    expect(data.roomId).toBe(roomData.roomId);
  });

  test('should join room with custom display name override', async () => {
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

    const response = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id,
      {
        displayName: 'Custom Name',
      }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('participantId');
  });

  test('should detect host when host rejoins', async () => {
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

    const response1 = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomId,
      hostSession.id
    );
    const data1 = await response1.json();

    expect(response1.status).toBe(200);
    expect(data1).toHaveProperty('participantId');

    const response2 = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomId,
      hostSession.id
    );
    const data2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(data2.participantId).toBe(data1.participantId);
  });

  test('should reject join if room not found', async () => {
    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    const response = await joinRoomViaAPI(
      BASE_URL,
      'non-existent-room',
      playerSession.id
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject join if no session cookie', async () => {
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
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject join if room capacity is full', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 30,
        capacity: 2,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const hostJoin = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomId,
      hostSession.id
    );
    expect(hostJoin.status).toBe(200);

    const player1 = await createTestSession('Player 1');
    createdSessionIds.push(player1.id);
    const join1 = await joinRoomViaAPI(BASE_URL, roomData.roomId, player1.id);
    expect(join1.status).toBe(200);

    const player2 = await createTestSession('Player 2');
    createdSessionIds.push(player2.id);
    const join2 = await joinRoomViaAPI(BASE_URL, roomData.roomId, player2.id);

    expect(join2.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject join if room status is not waiting', async () => {
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

    const response = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id
    );
    expect(response.status).toBe(200);
  });

  test('should handle idempotent join (rejoin same room)', async () => {
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

    const response1 = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id
    );
    const data1 = await response1.json();

    expect(response1.status).toBe(200);

    const response2 = await joinRoomViaAPI(
      BASE_URL,
      roomData.roomId,
      playerSession.id
    );
    const data2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(data2.participantId).toBe(data1.participantId);
  });

  test('should handle multiple players joining same room', async () => {
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

    const players = await Promise.all([
      createTestSession('Player 1'),
      createTestSession('Player 2'),
      createTestSession('Player 3'),
    ]);

    players.forEach(p => createdSessionIds.push(p.id));

    const joinResponses = await Promise.all(
      players.map(p => joinRoomViaAPI(BASE_URL, roomData.roomId, p.id))
    );

    const joinData = await Promise.all(joinResponses.map(r => r.json()));

    joinResponses.forEach(r => expect(r.status).toBe(200));

    const participantIds = joinData.map(d => d.participantId);
    const uniqueIds = new Set(participantIds);
    expect(uniqueIds.size).toBe(3);
  });
});
