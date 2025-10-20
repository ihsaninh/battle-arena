import type { RealtimeChannel } from "@supabase/realtime-js";

export type BattleEventListener = (
  event: string,
  payload: Record<string, unknown>
) => void;

export interface ConnectionInfo {
  channel: RealtimeChannel;
  userId: string;
  timestamp: number;
  roomId: string;
}
