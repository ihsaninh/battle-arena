/**
 * Integration Tests for GET /api/battle/rooms/[roomId]/availability
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/battle/rooms/[roomId]/availability/ (in terminal 2)
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
  getBasicHeaders,
} from '../../../../../helpers/api-helpers';

const BASE_URL = getTestServerUrl();

// Helper to get room availability via API
async function getRoomAvailabilityViaAPI(roomId: string) {
  const response = await fetch(
    `${BASE_URL}/api/battle/rooms/${roomId}/availability`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return response;
}

describe('GET /api/battle/rooms/[roomId]/availability', () => {
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
        '   Terminal 2: bun test __tests__/api/battle/rooms/[roomId]/availability/\n'
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

  test('should return availability for existing room', async () => {
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

    const response = await getRoomAvailabilityViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status');
    expect(['waiting', 'active', 'finished']).toContain(data.status);
  });

  test('should return room metadata in availability', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 5,
        roundTimeSec: 60,
        topic: 'Science',
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await getRoomAvailabilityViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('meta');
    expect(data.meta).toHaveProperty('language');
    expect(data.meta).toHaveProperty('numQuestions');
    expect(data.meta.language).toBe('en');
    expect(data.meta.numQuestions).toBe(5);
  });

  test('should return room capacity', async () => {
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

    const response = await getRoomAvailabilityViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('capacity');
    expect(data.capacity).toBe(4);
    expect(data).toHaveProperty('currentParticipants');
  });

  test('should return topic if set', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
        topic: 'History',
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await getRoomAvailabilityViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.meta).toHaveProperty('topic');
    expect(data.meta.topic).toBe('History');
  });

  test('should return round time per question', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 45,
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await getRoomAvailabilityViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.meta).toHaveProperty('roundTimeSec');
    expect(data.meta.roundTimeSec).toBe(45);
  });

  test('should reject when room not found', async () => {
    const response = await getRoomAvailabilityViaAPI('non-existent-room-id');

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should resolve room by room code', async () => {
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

    // Try to fetch by room code instead of room ID
    const response = await getRoomAvailabilityViaAPI(roomData.roomCode);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBeTruthy();
  });

  test('should include difficulty if set', async () => {
    const hostSession = await createTestSession('Host');
    createdSessionIds.push(hostSession.id);

    const roomData = await createRoomViaAPI(
      BASE_URL,
      {
        hostDisplayName: 'Host',
        language: 'en',
        numQuestions: 3,
        roundTimeSec: 30,
        difficulty: 'hard',
      },
      hostSession.id
    );
    createdRoomIds.push(roomData.roomId);

    const response = await getRoomAvailabilityViaAPI(roomData.roomId);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.meta).toHaveProperty('difficulty');
    expect(data.meta.difficulty).toBe('hard');
  });

  test('should be accessible without authentication', async () => {
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

    // No headers, no session required
    const response = await fetch(
      `${BASE_URL}/api/battle/rooms/${roomData.roomId}/availability`,
      {
        method: 'GET',
      }
    );

    expect(response.status).toBe(200);
  });
});
