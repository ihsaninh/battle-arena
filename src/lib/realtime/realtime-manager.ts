import type { RealtimeChannel } from "@supabase/realtime-js";

import type { BattleEventListener } from "@/src/types/realtime";

import { connectionManager } from "./connection-manager";
import { battleEventBuffer } from "./event-buffer";

interface RealtimeManagerConfig {
  enableReconnection: boolean;
  enableEventBuffer: boolean;
  maxConnectionsPerUser: number;
  connectionTimeoutMs: number;
  maxBufferSize: number;
  processingDelayMs: number;
}

interface RealtimeManagerOptions {
  config?: Partial<RealtimeManagerConfig>;
}

/**
 * A unified manager for all realtime functionality
 * Consolidates connection management, event buffering, and reconnection logic
 */
export class RealtimeManager {
  private config: RealtimeManagerConfig;

  constructor(options: RealtimeManagerOptions = {}) {
    this.config = {
      enableReconnection: true,
      enableEventBuffer: true,
      maxConnectionsPerUser: 3,
      connectionTimeoutMs: 10000,
      maxBufferSize: 50,
      processingDelayMs: 100,
      ...options.config,
    };

    // Update the connection manager configuration
    connectionManager.updateConfig({
      maxConnectionsPerUser: this.config.maxConnectionsPerUser,
      connectionTimeoutMs: this.config.connectionTimeoutMs,
      enableReconnection: this.config.enableReconnection,
    });

    // Update the event buffer configuration
    battleEventBuffer.updateConfig({
      maxBufferSize: this.config.maxBufferSize,
      processingDelayMs: this.config.processingDelayMs,
    });
  }

  /**
   * Creates a basic room channel
   */
  createRoomChannel(
    roomId: string,
    presenceKey?: string
  ): RealtimeChannel | null {
    return connectionManager.createRoomChannel(roomId, presenceKey);
  }

  /**
   * Creates an enhanced room channel with reconnection support
   */
  createEnhancedRoomChannel(
    roomId: string,
    onReconnect?: () => void,
    presenceKey?: string
  ): RealtimeChannel | null {
    const channel = connectionManager.createEnhancedRoomChannel(
      roomId,
      onReconnect,
      presenceKey
    );

    if (channel && this.config.enableEventBuffer) {
      this.setupEventBuffering(channel, roomId);
    }

    return channel;
  }

  /**
   * Sets up event buffering for a channel
   */
  private setupEventBuffering(channel: RealtimeChannel, roomId: string): void {
    channel.on("broadcast", { event: "*" }, (payload) => {
      const eventType = payload.event as string;
      const sequence = (payload.payload?.sequence as number) || Date.now();

      battleEventBuffer.addEvent(roomId, {
        sequence,
        event: eventType,
        payload: payload.payload as Record<string, unknown>,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Adds an event listener for a specific room
   */
  addEventListener(roomId: string, listener: BattleEventListener): void {
    battleEventBuffer.addEventListener(roomId, listener);
  }

  /**
   * Removes an event listener for a specific room
   */
  removeEventListener(roomId: string, listener: BattleEventListener): void {
    battleEventBuffer.removeEventListener(roomId, listener);
  }

  /**
   * Gets connection statistics
   */
  getConnectionStats() {
    return connectionManager.getConnectionStats();
  }

  /**
   * Gets event buffer statistics
   */
  getEventBufferStats() {
    return battleEventBuffer.getStats();
  }

  /**
   * Gets comprehensive realtime system statistics
   */
  getStats() {
    return {
      connections: this.getConnectionStats(),
      eventBuffer: this.getEventBufferStats(),
      config: this.config,
    };
  }

  /**
   * Cleans up all connections and buffers
   */
  cleanup(): void {
    connectionManager.cleanupConnections();

    // Note: We don't clear the event buffer here as it might be shared
    // If needed, we could add a method to clear specific rooms or all buffers
  }

  /**
   * Updates the configuration
   */
  updateConfig(config: Partial<RealtimeManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Update dependent configurations
    connectionManager.updateConfig({
      maxConnectionsPerUser: this.config.maxConnectionsPerUser,
      connectionTimeoutMs: this.config.connectionTimeoutMs,
      enableReconnection: this.config.enableReconnection,
    });

    battleEventBuffer.updateConfig({
      maxBufferSize: this.config.maxBufferSize,
      processingDelayMs: this.config.processingDelayMs,
    });
  }
}

// Export a singleton instance for use throughout the app
export const realtimeManager = new RealtimeManager();
