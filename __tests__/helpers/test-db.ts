/**
 * Test Database Helpers
 * Utilities for database operations in tests
 */

import { createClient } from '@supabase/supabase-js';

// Load env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars for tests:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  throw new Error(
    'Test environment requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
      'Make sure .env.local is present or set these in your test environment.'
  );
}

export const testDb = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Clean up test data by session ID
 */
export async function cleanupTestSession(sessionId: string) {
  // Delete in order to respect foreign keys
  await testDb.from('battle_room_answers').delete().eq('session_id', sessionId);
  await testDb
    .from('battle_room_participants')
    .delete()
    .eq('session_id', sessionId);
  await testDb.from('battle_sessions').delete().eq('id', sessionId);
}

/**
 * Clean up test room and related data
 */
export async function cleanupTestRoom(roomId: string) {
  await testDb.from('battle_room_answers').delete().eq('room_id', roomId);
  await testDb.from('battle_room_participants').delete().eq('room_id', roomId);
  await testDb.from('battle_room_rounds').delete().eq('room_id', roomId);
  await testDb.from('battle_teams').delete().eq('room_id', roomId);
  await testDb.from('battle_rooms').delete().eq('id', roomId);
}

/**
 * Create a test session
 */
export async function createTestSession(displayName: string = 'Test Player') {
  const sessionId = `test-session-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const fingerprintHash = `fp-${displayName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  const { data, error } = await testDb
    .from('battle_sessions')
    .insert({
      id: sessionId,
      display_name: displayName,
      fingerprint_hash: fingerprintHash,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string) {
  const { data } = await testDb
    .from('battle_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  return data;
}
