export {
  cleanupConnections,
  createEnhancedRoomChannel,
  createRoomChannel,
  getConnectionStats,
} from "./client-connections";
export { publishBattleEvent } from "./server-publisher";
export type { BattleEventListener } from "@/src/types/realtime";

// New refactored exports
export { ConnectionManager, connectionManager } from "./connection-manager";
export {
  addBattleEventListener,
  battleEventBuffer,
  type BufferedEvent,
  EventBuffer,
  removeBattleEventListener,
} from "./event-buffer";
export { RealtimeManager, realtimeManager } from "./realtime-manager";
export { ReconnectionStrategy } from "./reconnection-strategy";
