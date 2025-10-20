import type { RealtimeChannel } from "@supabase/realtime-js";

import { ConnectionInfo } from "@/src/types/realtime";
import { supabaseBrowser } from "@/src/lib/supabase";

import { ReconnectionStrategy } from "./reconnection-strategy";

interface ConnectionConfig {
  maxConnectionsPerUser: number;
  connectionTimeoutMs: number;
  enableReconnection: boolean;
}

interface ConnectionManagerOptions {
  config?: Partial<ConnectionConfig>;
}

export class ConnectionManager {
  private activeConnections = new Map<string, ConnectionInfo>();
  private config: ConnectionConfig;
  private reconnectionStrategy: ReconnectionStrategy;

  constructor(options: ConnectionManagerOptions = {}) {
    this.config = {
      maxConnectionsPerUser: 3,
      connectionTimeoutMs: 10000,
      enableReconnection: true,
      ...options.config,
    };

    this.reconnectionStrategy = new ReconnectionStrategy();
  }

  /**
   * Creates a basic room channel without reconnection logic
   */
  createRoomChannel(
    roomId: string,
    presenceKey?: string
  ): RealtimeChannel | null {
    try {
      const sb = supabaseBrowser;
      if (!sb) {
        console.error("Supabase browser client not available");
        return null;
      }

      // Check and enforce connection limits
      if (!this.enforceConnectionLimits()) {
        console.error(
          "Connection limits enforced, cannot create new connection"
        );
        return null;
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
      const userId = this.getUserId();

      // Store connection info
      this.activeConnections.set(channelId, {
        channel,
        userId,
        timestamp: Date.now(),
        roomId,
      });

      // Set up basic system event handlers
      this.setupBasicEventHandlers(channel, roomId);

      // Override unsubscribe to clean up our tracking
      this.overrideUnsubscribe(channel, channelId);

      console.log(
        `🔌 New connection established for room:${roomId}. Total active: ${this.activeConnections.size}`
      );

      return channel;
    } catch (err) {
      console.error("Failed to create room channel:", err);
      return null;
    }
  }

  /**
   * Creates an enhanced room channel with reconnection logic
   */
  createEnhancedRoomChannel(
    roomId: string,
    onReconnect?: () => void,
    presenceKey?: string
  ): RealtimeChannel | null {
    const channel = this.createRoomChannel(roomId, presenceKey);
    if (!channel) return null;

    if (this.config.enableReconnection) {
      this.reconnectionStrategy.setupReconnection(channel, roomId, onReconnect);
    }

    return channel;
  }

  /**
   * Gets connection statistics
   */
  getConnectionStats() {
    const userId = this.getUserId();
    const userConnections = Array.from(this.activeConnections.values()).filter(
      (conn: ConnectionInfo) => conn.userId === userId
    ).length;

    return {
      totalConnections: this.activeConnections.size,
      userConnections,
      maxUserConnections: this.config.maxConnectionsPerUser,
      connectionsByUser: Array.from(this.activeConnections.values()).reduce(
        (acc: Record<string, number>, conn: ConnectionInfo) => {
          acc[conn.userId] = (acc[conn.userId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * Cleans up all active connections
   */
  cleanupConnections() {
    const connections = Array.from(this.activeConnections.entries());
    console.log(`🧹 Cleaning up ${connections.length} connections...`);

    let successfullyCleaned = 0;
    connections.forEach(([channelId, conn]) => {
      try {
        conn.channel.unsubscribe();
        this.activeConnections.delete(channelId);
        successfullyCleaned++;
      } catch (err) {
        console.error(`❌ Error cleaning up connection ${channelId}:`, err);
      }
    });

    console.log(
      `✅ Cleanup complete. Successfully cleaned: ${successfullyCleaned}/${connections.length}. Remaining connections: ${this.activeConnections.size}`
    );
  }

  /**
   * Updates the connection manager configuration
   */
  updateConfig(config: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): ConnectionConfig {
    return { ...this.config };
  }

  /**
   * Gets the current user ID
   */
  private getUserId(): string {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return "server";
      }
      return localStorage.getItem("user_id") || "anonymous";
    } catch (err) {
      console.warn("Error accessing localStorage, using anonymous ID:", err);
      return "anonymous";
    }
  }

  /**
   * Enforces connection limits per user
   */
  private enforceConnectionLimits(): boolean {
    const userId = this.getUserId();
    const userConns = Array.from(this.activeConnections.entries())
      .filter(([, conn]) => conn.userId === userId)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    if (userConns.length >= this.config.maxConnectionsPerUser) {
      console.warn(
        `⚠️ Connection limit reached for user ${userId}. Current: ${userConns.length}, Max: ${this.config.maxConnectionsPerUser}`
      );

      const excess = userConns.length - this.config.maxConnectionsPerUser + 1;
      let successfullyClosed = 0;

      for (let i = 0; i < excess; i++) {
        const [channelId, conn] = userConns[i];
        console.log(`🔄 Closing excess connection: ${channelId}`);
        try {
          conn.channel.unsubscribe();
          this.activeConnections.delete(channelId);
          successfullyClosed++;
        } catch (err) {
          console.error("Error closing excess connection:", err);
        }
      }

      // Return false if we couldn't close enough connections
      return successfullyClosed === excess;
    }

    return true;
  }

  /**
   * Sets up basic event handlers for the channel
   */
  private setupBasicEventHandlers(channel: RealtimeChannel, roomId: string) {
    channel.on("system", { event: "*" }, (payload) => {
      console.log(`🔗 Channel system event for room:${roomId}:`, payload.type);
    });

    channel.on("system", { event: "CHANNEL_ERROR" }, (payload) => {
      console.error(`💥 Channel error for room:${roomId}:`, payload);
    });
  }

  /**
   * Overrides the unsubscribe method to clean up our tracking
   */
  private overrideUnsubscribe(channel: RealtimeChannel, channelId: string) {
    const originalUnsubscribe = channel.unsubscribe.bind(channel);

    channel.unsubscribe = async () => {
      this.activeConnections.delete(channelId);
      console.log(
        `🧹 Cleaned up connection for room:${channelId.replace(
          "room:",
          ""
        )}. Active connections: ${this.activeConnections.size}`
      );
      return originalUnsubscribe();
    };
  }
}

// Export a singleton instance for use throughout the app
export const connectionManager = new ConnectionManager();
