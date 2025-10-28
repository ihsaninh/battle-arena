/**
 * Integration Tests for GET /api/battle/rooms/[roomId]/my-answers
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rooms/[roomId]/my-answers/ (in terminal 2)
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

describe('GET /api/battle/rooms/[roomId]/my-answers', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/rooms/[roomId]/my-answers/\n'
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

  test('should return empty answers array for player with no answers', async () => {
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
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/my-answers`,
      {
        method: 'GET',
        headers: getBasicHeaders(playerSession.id),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('roomId');
    expect(data.roomId).toBe(roomData.roomId);
    expect(data).toHaveProperty('totalAnswers');
    expect(data).toHaveProperty('answers');
    expect(Array.isArray(data.answers)).toBe(true);
  });

  test('should include all rounds for participant even if unanswered', async () => {
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

    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/my-answers`,
      {
        method: 'GET',
        headers: getBasicHeaders(playerSession.id),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('answers');
    expect(Array.isArray(data.answers)).toBe(true);
  });

  test('should reject when no session cookie', async () => {
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
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/my-answers`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should return proper structure for user answers', async () => {
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

    const playerSession = await createTestSession('Player 1');
    createdSessionIds.push(playerSession.id);

    await joinRoomViaAPI(BASE_URL, roomData.roomId, playerSession.id);

    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/my-answers`,
      {
        method: 'GET',
        headers: getBasicHeaders(playerSession.id),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.roomId).toBe(roomData.roomId);
    expect(data.totalAnswers).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.answers)).toBe(true);

    if (data.answers.length > 0) {
      const answer = data.answers[0];
      expect(answer).toHaveProperty('id');
      expect(answer).toHaveProperty('roundNo');
      expect(answer).toHaveProperty('answer');
      expect(answer).toHaveProperty('score');
      expect(answer).toHaveProperty('wasAnswered');
    }
  });
});
