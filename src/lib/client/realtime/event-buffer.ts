import { BattleEventListener } from '@/src/types/realtime';

export interface BufferedEvent {
  sequence: number;
  event: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

interface EventBufferConfig {
  maxBufferSize: number;
  processingDelayMs: number;
}

interface EventBufferOptions {
  config?: Partial<EventBufferConfig>;
}

/**
 * A simplified event buffer that processes events in order
 * without complex sequencing logic
 */
export class EventBuffer {
  private buffer = new Map<string, BufferedEvent[]>();
  private eventListeners = new Map<string, BattleEventListener[]>();
  private processingTimeouts = new Map<string, NodeJS.Timeout>();
  private config: EventBufferConfig;

  constructor(options: EventBufferOptions = {}) {
    this.config = {
      maxBufferSize: 50,
      processingDelayMs: 100,
      ...options.config,
    };
  }

  /**
   * Adds an event to the buffer and schedules processing
   */
  addEvent(roomId: string, event: BufferedEvent): void {
    // Initialize buffer for room if it doesn't exist
    if (!this.buffer.has(roomId)) {
      this.buffer.set(roomId, []);
    }

    const roomBuffer = this.buffer.get(roomId)!;

    // Handle buffer overflow
    if (roomBuffer.length >= this.config.maxBufferSize) {
      console.warn(
        `[BUFFER] Buffer overflow for room ${roomId}, dropping oldest event`
      );
      roomBuffer.shift();
    }

    // Add event to buffer
    roomBuffer.push(event);

    // Sort by sequence number to ensure proper order
    roomBuffer.sort((a, b) => a.sequence - b.sequence);

    // Clear any existing timeout for this room
    const existingTimeout = this.processingTimeouts.get(roomId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule processing with debounce
    const timeout = setTimeout(() => {
      this.processEvents(roomId);
      this.processingTimeouts.delete(roomId);
    }, this.config.processingDelayMs);

    this.processingTimeouts.set(roomId, timeout);
  }

  /**
   * Processes all pending events for a room
   */
  processEvents(roomId: string): void {
    const roomBuffer = this.buffer.get(roomId);
    if (!roomBuffer || roomBuffer.length === 0) return;

    // Process all events in order
    roomBuffer.forEach(event => {
      this.emitEvent(roomId, event);
    });

    // Clear the buffer for this room
    this.buffer.delete(roomId);
  }

  /**
   * Clears all events for a specific room
   */
  clearBuffer(roomId: string): void {
    // Clear any pending timeout
    const timeout = this.processingTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.processingTimeouts.delete(roomId);
    }

    // Clear the buffer
    this.buffer.delete(roomId);
  }

  /**
   * Adds an event listener for a specific room
   */
  addEventListener(roomId: string, listener: BattleEventListener): void {
    if (!this.eventListeners.has(roomId)) {
      this.eventListeners.set(roomId, []);
    }
    this.eventListeners.get(roomId)!.push(listener);
  }

  /**
   * Removes an event listener for a specific room
   */
  removeEventListener(roomId: string, listener: BattleEventListener): void {
    const listeners = this.eventListeners.get(roomId);
    if (!listeners) return;

    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }

    // Clean up if no more listeners
    if (listeners.length === 0) {
      this.eventListeners.delete(roomId);
    }
  }

  /**
   * Gets statistics about the buffer
   */
  getStats() {
    const totalEvents = Array.from(this.buffer.values()).reduce(
      (sum, events) => sum + events.length,
      0
    );

    return {
      totalRooms: this.buffer.size,
      totalEvents,
      totalListeners: this.eventListeners.size,
      roomsWithListeners: this.eventListeners.size,
      maxBufferSize: this.config.maxBufferSize,
      processingDelayMs: this.config.processingDelayMs,
    };
  }

  /**
   * Updates the event buffer configuration
   */
  updateConfig(config: Partial<EventBufferConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): EventBufferConfig {
    return { ...this.config };
  }

  /**
   * Emits an event to all listeners for a room
   */
  private emitEvent(roomId: string, event: BufferedEvent): void {
    const listeners = this.eventListeners.get(roomId) || [];

    listeners.forEach(listener => {
      try {
        listener(event.event, event.payload);
      } catch (err) {
        console.error(
          `[BUFFER] Error in event listener for ${event.event}:`,
          err
        );
      }
    });
  }
}

// Export a singleton instance for use throughout the app
export const battleEventBuffer = new EventBuffer();

// Export convenience functions that match the original API
export function addBattleEventListener(
  roomId: string,
  listener: BattleEventListener
): void {
  battleEventBuffer.addEventListener(roomId, listener);
}

export function removeBattleEventListener(
  roomId: string,
  listener: BattleEventListener
): void {
  battleEventBuffer.removeEventListener(roomId, listener);
}
