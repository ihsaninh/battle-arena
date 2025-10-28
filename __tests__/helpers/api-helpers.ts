/**
 * Shared API helper functions for integration tests
 */

const BATTLE_SESSION_COOKIE = 'battle_session_id';

export function getBasicHeaders(sessionId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sessionId) {
    headers.Cookie = `${BATTLE_SESSION_COOKIE}=${sessionId}`;
  }

  return headers;
}

export async function createRoomViaAPI(
  baseUrl: string,
  roomData: any,
  sessionId: string
) {
  const response = await fetch(`${baseUrl}/api/battle/rooms`, {
    method: 'POST',
    headers: getBasicHeaders(sessionId),
    body: JSON.stringify(roomData),
  });
  return response.json();
}

export async function joinRoomViaAPI(
  baseUrl: string,
  roomId: string,
  sessionId: string,
  joinData?: any
) {
  const response = await fetch(`${baseUrl}/api/battle/rooms/${roomId}/join`, {
    method: 'POST',
    headers: getBasicHeaders(sessionId),
    body: JSON.stringify(joinData || {}),
  });
  return response;
}

export async function setReadyViaAPI(
  baseUrl: string,
  roomId: string,
  sessionId: string,
  ready: boolean
) {
  const response = await fetch(`${baseUrl}/api/battle/rooms/${roomId}/ready`, {
    method: 'POST',
    headers: getBasicHeaders(sessionId),
    body: JSON.stringify({ ready }),
  });
  return response;
}
