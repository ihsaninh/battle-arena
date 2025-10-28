import type { RealtimeChannel } from '@supabase/realtime-js';

import { supabaseAdmin } from '@/src/lib/database/supabase';
import { realtimeLogger } from '@/src/lib/utils/logger';

import { getConnectionStats } from './client-connections';

const channelQueues = new Map<string, Promise<boolean>>();
const serverChannelStates = new Map<string, ServerChannelState>();
const channelCreationPromises = new Map<string, Promise<RealtimeChannel>>();

interface ServerChannelState {
  channel: RealtimeChannel;
  lastUsed: number;
}

export async function publishBattleEvent(params: {
  roomId: string;
  event: string;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  const enqueueKey = params.roomId;
  const previous = channelQueues.get(enqueueKey) ?? Promise.resolve(true);

  const eventPayload = {
    sequence: Date.now(),
    ...params.payload,
  };

  const execute = async () => {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const channel = await ensureSubscribedChannel(params.roomId);

        await channel.send({
          type: 'broadcast',
          event: params.event,
          payload: eventPayload,
        });

        updateChannelUsage(params.roomId);
        realtimeLogger.success(
          `Published ${params.event} to room:${params.roomId}`
        );
        return true;
      } catch (err) {
        retryCount++;
        realtimeLogger.error(
          `publishBattleEvent failed (attempt ${retryCount}/${
            maxRetries + 1
          }):`,
          {
            roomId: params.roomId,
            event: params.event,
            error: err instanceof Error ? err.message : String(err),
          }
        );

        await dropServerChannel(params.roomId);

        if (retryCount <= maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000)
          );
        }
      }
    }

    realtimeLogger.error(
      `publishBattleEvent failed after ${maxRetries + 1} attempts for ${
        params.event
      }`
    );

    const connectionStats = getConnectionStats();
    realtimeLogger.debug(
      `Connection stats at time of failure:`,
      connectionStats
    );
    return false;
  };

  const task = previous.then(execute, execute);
  const queuePromise = task.catch(() => false);
  channelQueues.set(enqueueKey, queuePromise);

  try {
    const result = await task;
    return Boolean(result);
  } finally {
    if (channelQueues.get(enqueueKey) === queuePromise) {
      channelQueues.delete(enqueueKey);
    }
  }
}

async function ensureSubscribedChannel(roomId: string) {
  const existingState = serverChannelStates.get(roomId);
  if (existingState) {
    return existingState.channel;
  }

  let creationPromise = channelCreationPromises.get(roomId);
  if (!creationPromise) {
    creationPromise = createSubscribedChannel(roomId);
    channelCreationPromises.set(roomId, creationPromise);
  }

  try {
    const channel = await creationPromise;
    serverChannelStates.set(roomId, {
      channel,
      lastUsed: Date.now(),
    });
    return channel;
  } finally {
    channelCreationPromises.delete(roomId);
  }
}

async function createSubscribedChannel(roomId: string) {
  const supabase = supabaseAdmin();
  const channel = supabase.channel(`room:${roomId}`);

  await waitForSubscription(roomId, channel);
  setupServerChannelTeardown(roomId, channel);

  return channel;
}

function waitForSubscription(roomId: string, channel: RealtimeChannel) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Subscription timeout for room:${roomId}`));
    }, 5000);

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        reject(new Error(`Subscription failed: ${status}`));
      }
    });
  });
}

function setupServerChannelTeardown(roomId: string, channel: RealtimeChannel) {
  channel.on('system', { event: 'CHANNEL_ERROR' }, payload => {
    realtimeLogger.error(`Server channel error for room:${roomId}:`, payload);
    void dropServerChannel(roomId);
  });

  channel.on('system', { event: 'CLOSED' }, () => {
    realtimeLogger.info(`Server channel closed for room:${roomId}`);
    void dropServerChannel(roomId);
  });
}

async function dropServerChannel(roomId: string) {
  const state = serverChannelStates.get(roomId);
  if (!state) return;

  serverChannelStates.delete(roomId);

  try {
    await state.channel.unsubscribe();
  } catch (err) {
    realtimeLogger.warn(
      `Failed to unsubscribe server channel for room:${roomId}`,
      err
    );
  }
}

function updateChannelUsage(roomId: string) {
  const state = serverChannelStates.get(roomId);
  if (!state) return;
  state.lastUsed = Date.now();
}
