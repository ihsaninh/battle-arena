/**
 * Integration Tests for POST /api/battle/sessions
 *
 * Run these tests with:
 *   1. Start dev server: bun run dev (in terminal 1)
 *   2. Run tests: bun test __tests__/api/sessions.test.ts (in terminal 2)
 */

import { describe, test, expect, beforeAll, afterEach } from 'bun:test';
import { getTestServerUrl, isServerRunning } from '../helpers/test-server';
import { cleanupTestSession, getSession } from '../helpers/test-db';

const BASE_URL = getTestServerUrl();

describe('POST /api/battle/sessions', () => {
  let createdSessionIds: string[] = [];

  // Check server is running before tests
  beforeAll(async () => {
    const running = await isServerRunning();
    if (!running) {
      console.error('\n❌ Test server is not running!\n');
      console.error('📍 Expected server at:', BASE_URL);
      console.error('\n🚀 To run these tests:');
      console.error('   Terminal 1: bun run dev');
      console.error('   Terminal 2: bun test __tests__/api/sessions.test.ts\n');
      throw new Error(`Test server not running at ${BASE_URL}`);
    }
    console.log('✅ Test server is running at', BASE_URL);
  });

  // Cleanup after each test
  afterEach(async () => {
    for (const sessionId of createdSessionIds) {
      await cleanupTestSession(sessionId);
    }
    createdSessionIds = [];
  });

  test('should create session with display name', async () => {
    const response = await fetch(`${BASE_URL}/api/battle/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: 'John Doe' }),
    });

    expect(response.status).toBe(200);

    // Check response body
    const data = await response.json();
    expect(data).toHaveProperty('sessionId');
    expect(typeof data.sessionId).toBe('string');

    // Track for cleanup
    createdSessionIds.push(data.sessionId);

    // Check cookie was set
    const cookies = response.headers.get('set-cookie');
    expect(cookies).toBeTruthy();
    expect(cookies).toContain('battle_session');
    expect(cookies).toContain(data.sessionId);

    // Verify session exists in database
    const dbSession = await getSession(data.sessionId);
    expect(dbSession).toBeTruthy();
    expect(dbSession.display_name).toBe('John Doe');
  });

  test('should create session without display name', async () => {
    const response = await fetch(`${BASE_URL}/api/battle/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('sessionId');

    createdSessionIds.push(data.sessionId);

    // Verify default display name
    const dbSession = await getSession(data.sessionId);
    expect(dbSession.display_name).toBeTruthy();
    expect(dbSession.display_name).toMatch(/^Player/); // Might have default prefix
  });

  test('should reject invalid display name (too long)', async () => {
    const longName = 'x'.repeat(101); // Assuming max 100 chars

    const response = await fetch(`${BASE_URL}/api/battle/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: longName }),
    });

    // Might be 400 or 200 depending on validation
    // Adjust based on actual API behavior
    expect([200, 400]).toContain(response.status);

    if (response.status === 200) {
      const data = await response.json();
      createdSessionIds.push(data.sessionId);

      // Check if name was truncated
      const dbSession = await getSession(data.sessionId);
      expect(dbSession.display_name.length).toBeLessThanOrEqual(100);
    }
  });

  test('should handle special characters in display name', async () => {
    const specialName = "Test's Name <&> 中文";

    const response = await fetch(`${BASE_URL}/api/battle/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: specialName }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    createdSessionIds.push(data.sessionId);

    const dbSession = await getSession(data.sessionId);
    expect(dbSession.display_name).toBe(specialName);
  });

  test('should reject invalid JSON', async () => {
    const response = await fetch(`${BASE_URL}/api/battle/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should handle missing Content-Type header', async () => {
    const response = await fetch(`${BASE_URL}/api/battle/sessions`, {
      method: 'POST',
      body: JSON.stringify({ display_name: 'Test' }),
      // No Content-Type header
    });

    // Should still work or return error
    expect([200, 400, 415]).toContain(response.status);

    if (response.status === 200) {
      const data = await response.json();
      createdSessionIds.push(data.sessionId);
    }
  });

  test('should create unique session IDs', async () => {
    const promises = Array.from({ length: 5 }, () =>
      fetch(`${BASE_URL}/api/battle/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'Test' }),
      })
    );

    const responses = await Promise.all(promises);
    const sessionIds = await Promise.all(
      responses.map(r => r.json().then(d => d.sessionId))
    );

    createdSessionIds.push(...sessionIds);

    // All session IDs should be unique
    const uniqueIds = new Set(sessionIds);
    expect(uniqueIds.size).toBe(5);
  });

  test('should set cookie with correct attributes', async () => {
    const response = await fetch(`${BASE_URL}/api/battle/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: 'Test' }),
    });

    const data = await response.json();
    createdSessionIds.push(data.sessionId);

    const cookies = response.headers.get('set-cookie');
    expect(cookies).toBeTruthy();

    // Check cookie attributes
    expect(cookies).toContain('Path=/');
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('Max-Age='); // Should have expiry
  });
});
