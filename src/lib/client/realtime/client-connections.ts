import type { RealtimeChannel } from '@supabase/realtime-js';

import { ConnectionInfo } from '@/src/types/realtime';
import { supabaseBrowser } from '@/src/lib/database/supabase';

import { battleEventBuffer } from './event-buffer';

const activeConnections = new Map<string, ConnectionInfo>();
const MAX_CONNECTIONS_PER_USER = 3;

function getUserId(): string {
  if (typeof window === 'undefined') return 'server';
  return localStorage.getItem('user_id') || 'anonymous';
}

export function createRoomChannel(
  roomId: string,
  presenceKey?: string
): RealtimeChannel | null {
  try {
    const sb = supabaseBrowser;
    if (!sb) {
      console.error('Supabase browser client not available');
      return null;
    }

    const userId = getUserId();
    const userConns = Array.from(activeConnections.entries())
      .filter(([, conn]) => conn.userId === userId)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    if (userConns.length >= MAX_CONNECTIONS_PER_USER) {
      console.warn(
        `⚠️ Connection limit reached for user ${userId}. Current: ${userConns.length}, Max: ${MAX_CONNECTIONS_PER_USER}`
      );

      const excess = userConns.length - MAX_CONNECTIONS_PER_USER + 1;
      for (let i = 0; i < excess; i++) {
        const [channelId, conn] = userConns[i];
        console.log(`🔄 Closing excess connection: ${channelId}`);
        try {
          conn.channel.unsubscribe();
          activeConnections.delete(channelId);
        } catch (err) {
          console.error('Error closing excess connection:', err);
        }
      }
    }

    const channel = sb.channel(`room:${roomId}`, {
      config: presenceKey
        ? {
            broadcast: { self: false },
            presence: { key: presenceKey },
          }
        : {
            broadcast: { self: false },
          },
    });

    const channelId = `room:${roomId}`;
    activeConnections.set(channelId, {
      channel,
      userId,
      timestamp: Date.now(),
      roomId,
    });

    channel.on('system', { event: '*' }, payload => {
      console.log(`🔗 Channel system event for room:${roomId}:`, payload.type);
    });

    channel.on('system', { event: 'CHANNEL_ERROR' }, payload => {
      console.error(`💥 Channel error for room:${roomId}:`, payload);
    });

    const originalUnsubscribe = channel.unsubscribe.bind(channel);
    channel.unsubscribe = async () => {
      activeConnections.delete(channelId);
      console.log(
        `🧹 Cleaned up connection for room:${roomId}. Active connections: ${activeConnections.size}`
      );
      return originalUnsubscribe();
    };

    console.log(
      `🔌 New connection established for room:${roomId}. Total active: ${activeConnections.size}`
    );
    return channel;
  } catch (err) {
    console.error('Failed to create room channel:', err);
    return null;
  }
}

export function createEnhancedRoomChannel(
  roomId: string,
  onReconnect?: () => void,
  presenceKey?: string
): RealtimeChannel | null {
  const channel = createRoomChannel(roomId, presenceKey);
  if (!channel) return null;

  const bufferedEventHandler = (
    eventType: string,
    payload: Record<string, unknown>
  ) => {
    const sequence = (payload?.sequence as number) || Date.now();

    battleEventBuffer.addEvent(roomId, {
      sequence,
      event: eventType,
      payload,
      timestamp: Date.now(),
    });
  };

  channel.on('broadcast', { event: '*' }, payload => {
    const eventType = payload.event as string;
    bufferedEventHandler(eventType, payload.payload as Record<string, unknown>);
  });

  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;
  let isDestroyed = false;
  let connectionTimeout: NodeJS.Timeout | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isReconnecting = false;
  let lastReconnectTime = 0;
  const minReconnectInterval = 5000;
  const maxReconnectDelay = 30000;

  let circuitBreakerOpen = false;
  let circuitBreakerTimeout: NodeJS.Timeout | null = null;
  const circuitBreakerDuration = 60000;

  const attemptReconnection = () => {
    if (isDestroyed || isReconnecting || circuitBreakerOpen) {
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastReconnectTime;

    if (timeSinceLastAttempt < minReconnectInterval) {
      const waitTime = minReconnectInterval - timeSinceLastAttempt;
      reconnectTimeout = setTimeout(() => attemptReconnection(), waitTime);
      return;
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error(
        `💥 Max reconnection attempts (${maxReconnectAttempts}) reached for room:${roomId}`
      );

      circuitBreakerOpen = true;
      circuitBreakerTimeout = setTimeout(() => {
        console.log(
          `🔄 Circuit breaker closed for room:${roomId}, allowing reconnection attempts`
        );
        circuitBreakerOpen = false;
        reconnectAttempts = 0;
      }, circuitBreakerDuration);

      return;
    }

    isReconnecting = true;
    lastReconnectTime = now;
    reconnectAttempts++;

    console.log(
      `🔄 Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts} for room:${roomId}`
    );

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.log(
          `✅ Reconnected to room:${roomId} on attempt ${reconnectAttempts}`
        );
        reconnectAttempts = 0;
        isReconnecting = false;
        onReconnect?.();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(
          `❌ Reconnection attempt ${reconnectAttempts} failed for room:${roomId}`
        );
        isReconnecting = false;

        const delay = Math.min(
          Math.pow(2, reconnectAttempts) * 1000,
          maxReconnectDelay
        );
        reconnectTimeout = setTimeout(() => attemptReconnection(), delay);
      }
    });
  };

  connectionTimeout = setTimeout(() => {
    if (!isDestroyed) {
      console.warn(`⏰ Connection timeout for room:${roomId}`);
      attemptReconnection();
    }
  }, 10000);

  const setupReconnectionLogic = () => {
    channel.on('system', { event: 'CHANNEL_ERROR' }, () => {
      if (isDestroyed) return;

      console.warn(
        `🔄 Channel error for room:${roomId}, attempting reconnection...`
      );

      attemptReconnection();
    });

    channel.on('system', { event: 'CLOSED' }, () => {
      if (isDestroyed) return;
      console.log(`🔌 Connection closed for room:${roomId}`);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    });

    channel.on('system', { event: 'SUBSCRIBED' }, () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    });
  };

  const originalUnsubscribe = channel.unsubscribe.bind(channel);
  channel.unsubscribe = async () => {
    isDestroyed = true;
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (circuitBreakerTimeout) {
      clearTimeout(circuitBreakerTimeout);
      circuitBreakerTimeout = null;
    }
    return originalUnsubscribe();
  };

  setupReconnectionLogic();
  return channel;
}

export function getConnectionStats() {
  const userId = getUserId();
  const userConnections = Array.from(activeConnections.values()).filter(
    (conn: ConnectionInfo) => conn.userId === userId
  ).length;

  return {
    totalConnections: activeConnections.size,
    userConnections,
    maxUserConnections: MAX_CONNECTIONS_PER_USER,
    connectionsByUser: Array.from(activeConnections.values()).reduce(
      (acc: Record<string, number>, conn: ConnectionInfo) => {
        acc[conn.userId] = (acc[conn.userId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

export function cleanupConnections() {
  const connections = Array.from(activeConnections.entries());
  console.log(`🧹 Cleaning up ${connections.length} connections...`);

  connections.forEach(([channelId, conn]) => {
    try {
      conn.channel.unsubscribe();
      activeConnections.delete(channelId);
    } catch (err) {
      console.error(`❌ Error cleaning up connection ${channelId}:`, err);
    }
  });

  console.log(
    `✅ Cleanup complete. Remaining connections: ${activeConnections.size}`
  );
}
