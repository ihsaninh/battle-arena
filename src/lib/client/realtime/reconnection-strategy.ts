import type { RealtimeChannel } from '@supabase/realtime-js';

import { connectionLogger } from '@/src/lib/utils/logger';

interface ReconnectionConfig {
  maxReconnectAttempts: number;
  minReconnectIntervalMs: number;
  maxReconnectDelayMs: number;
  circuitBreakerDurationMs: number;
  connectionTimeoutMs: number;
}

interface ReconnectionStrategyOptions {
  config?: Partial<ReconnectionConfig>;
}

export class ReconnectionStrategy {
  private config: ReconnectionConfig;

  constructor(options: ReconnectionStrategyOptions = {}) {
    this.config = {
      maxReconnectAttempts: 3,
      minReconnectIntervalMs: 5000,
      maxReconnectDelayMs: 30000,
      circuitBreakerDurationMs: 60000,
      connectionTimeoutMs: 10000,
      ...options.config,
    };
  }

  /**
   * Sets up reconnection logic for a channel
   */
  setupReconnection(
    channel: RealtimeChannel,
    roomId: string,
    onReconnect?: () => void
  ): void {
    let reconnectAttempts = 0;
    let isDestroyed = false;
    let connectionTimeout: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isReconnecting = false;
    let lastReconnectTime = 0;

    let circuitBreakerOpen = false;
    let circuitBreakerTimeout: NodeJS.Timeout | null = null;

    const attemptReconnection = () => {
      if (isDestroyed || isReconnecting || circuitBreakerOpen) {
        return;
      }

      const now = Date.now();
      const timeSinceLastAttempt = now - lastReconnectTime;

      if (timeSinceLastAttempt < this.config.minReconnectIntervalMs) {
        const waitTime =
          this.config.minReconnectIntervalMs - timeSinceLastAttempt;
        reconnectTimeout = setTimeout(() => attemptReconnection(), waitTime);
        return;
      }

      if (reconnectAttempts >= this.config.maxReconnectAttempts) {
        connectionLogger.error(
          `Max reconnection attempts (${this.config.maxReconnectAttempts}) reached for room:${roomId}`
        );

        circuitBreakerOpen = true;
        circuitBreakerTimeout = setTimeout(() => {
          connectionLogger.info(
            `Circuit breaker closed for room:${roomId}, allowing reconnection attempts`
          );
          circuitBreakerOpen = false;
          reconnectAttempts = 0;
        }, this.config.circuitBreakerDurationMs);

        return;
      }

      isReconnecting = true;
      lastReconnectTime = now;
      reconnectAttempts++;

      connectionLogger.info(
        `Attempting reconnection ${reconnectAttempts}/${this.config.maxReconnectAttempts} for room:${roomId}`
      );

      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          connectionLogger.success(
            `Reconnected to room:${roomId} on attempt ${reconnectAttempts}`
          );
          reconnectAttempts = 0;
          isReconnecting = false;
          onReconnect?.();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          connectionLogger.error(
            `Reconnection attempt ${reconnectAttempts} failed for room:${roomId}`
          );
          isReconnecting = false;

          const delay = Math.min(
            Math.pow(2, reconnectAttempts) * 1000,
            this.config.maxReconnectDelayMs
          );
          reconnectTimeout = setTimeout(() => attemptReconnection(), delay);
        }
      });
    };

    // Set up connection timeout
    connectionTimeout = setTimeout(() => {
      if (!isDestroyed) {
        connectionLogger.warn(`Connection timeout for room:${roomId}`);
        attemptReconnection();
      }
    }, this.config.connectionTimeoutMs);

    // Set up reconnection event handlers
    channel.on('system', { event: 'CHANNEL_ERROR' }, () => {
      if (isDestroyed) return;

      connectionLogger.warn(
        `Channel error for room:${roomId}, attempting reconnection...`
      );

      attemptReconnection();
    });

    channel.on('system', { event: 'CLOSED' }, () => {
      if (isDestroyed) return;
      connectionLogger.info(`Connection closed for room:${roomId}`);
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

    // Override unsubscribe to clean up all timeouts
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
  }

  /**
   * Updates the reconnection configuration
   */
  updateConfig(config: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current reconnection configuration
   */
  getConfig(): ReconnectionConfig {
    return { ...this.config };
  }
}
