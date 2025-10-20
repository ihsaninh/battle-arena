import type {
  BattleSessionRequest,
  BattleSessionResponse,
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  RoomAvailabilityResponse,
  StartBattlePayload,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
} from "@/src/types/api";
import type {
  AnswerStatus,
  RoomStats,
  ScoreboardEntry,
  StateResp,
  UserAnswersResponse,
} from "@/src/types/battle";

import { battleRequest } from "./api-request";

export const battleApi = {
  createSession: async (
    payload: BattleSessionRequest
  ): Promise<BattleSessionResponse> => {
    return battleRequest<BattleSessionResponse>("/sessions", {
      method: "POST",
      body: payload,
      fallbackMessage: "Failed to create battle session",
    });
  },

  // Create a new battle room
  createRoom: async (
    payload: CreateRoomPayload
  ): Promise<CreateRoomResponse> => {
    return battleRequest<CreateRoomResponse>("/rooms", {
      method: "POST",
      body: payload,
      fallbackMessage: "Failed to create room",
    });
  },

  // Join an existing battle room
  joinRoom: async (
    roomId: string,
    payload: JoinRoomPayload
  ): Promise<JoinRoomResponse> => {
    return battleRequest<JoinRoomResponse>(`/rooms/${roomId}/join`, {
      method: "POST",
      body: payload,
      fallbackMessage: "Failed to join room",
    });
  },

  checkRoomAvailability: async (
    roomId: string
  ): Promise<RoomAvailabilityResponse> => {
    return battleRequest<RoomAvailabilityResponse>(
      `/rooms/${roomId}/availability`,
      {
        fallbackMessage: "Failed to check room status",
      }
    );
  },

  // Get room state
  getRoomState: async (roomId: string): Promise<StateResp> => {
    return battleRequest<StateResp>(`/rooms/${roomId}/state`, {
      fallbackMessage: "Failed to fetch room state",
    });
  },

  // Get answer status for current round
  getAnswerStatus: async (roomId: string): Promise<AnswerStatus> => {
    return battleRequest<AnswerStatus>(`/rooms/${roomId}/answer-status`, {
      fallbackMessage: "Failed to fetch answer status",
    });
  },

  // Start battle (host only)
  startBattle: async (
    roomId: string,
    payload: StartBattlePayload,
    headers?: Record<string, string>
  ): Promise<void> => {
    await battleRequest(`/rooms/${roomId}/start`, {
      method: "POST",
      headers,
      body: payload,
      parseAs: "void",
      fallbackMessage: "Failed to start battle",
    });
  },

  setReadyStatus: async (
    roomId: string,
    ready: boolean
  ): Promise<void> => {
    await battleRequest(`/rooms/${roomId}/ready`, {
      method: "POST",
      body: { ready },
      parseAs: "void",
      fallbackMessage: "Failed to update ready status",
    });
  },

  // Submit answer for current round
  submitAnswer: async (
    roomId: string,
    roundNo: number,
    payload: SubmitAnswerPayload
  ): Promise<SubmitAnswerResponse> => {
    return battleRequest<SubmitAnswerResponse>(
      `/rooms/${roomId}/rounds/${roundNo}/answer`,
      {
        method: "POST",
        body: payload,
        fallbackMessage: "Failed to submit answer",
      }
    );
  },

  // Close current round (host only)
  closeRound: async (roomId: string, roundNo: number): Promise<void> => {
    await battleRequest(`/rooms/${roomId}/rounds/${roundNo}/close`, {
      method: "POST",
      parseAs: "void",
      fallbackMessage: "Failed to close round",
    });
  },

  // Reveal next round (host only)
  revealNextRound: async (roomId: string, roundNo: number): Promise<void> => {
    await battleRequest(`/rooms/${roomId}/rounds/${roundNo}/reveal`, {
      method: "POST",
      parseAs: "void",
      fallbackMessage: "Failed to reveal next round",
    });
  },

  advanceAfterScoreboard: async (
    roomId: string
  ): Promise<{ action: string; roundNo?: number }> => {
    return battleRequest<{ action: string; roundNo?: number }>(
      `/rooms/${roomId}/advance`,
      {
        method: "POST",
        fallbackMessage: "Failed to advance round",
      }
    );
  },

  // Get user's answers for completed battle
  getUserAnswers: async (roomId: string): Promise<UserAnswersResponse> => {
    return battleRequest<UserAnswersResponse>(`/rooms/${roomId}/my-answers`, {
      cache: "no-store",
      fallbackMessage: "Failed to fetch user answers",
    });
  },

  // Get final scoreboard
  getScoreboard: async (
    roomId: string
  ): Promise<{ scoreboard: ScoreboardEntry[] }> => {
    return battleRequest<{ scoreboard: ScoreboardEntry[] }>(
      `/rooms/${roomId}/scoreboard`,
      {
        cache: "no-store",
        fallbackMessage: "Failed to fetch scoreboard",
      }
    );
  },

  // Get room statistics (for results page)
  getRoomStats: async (roomId: string): Promise<RoomStats> => {
    return battleRequest<RoomStats>(`/rooms/${roomId}/state`, {
      cache: "no-store",
      fallbackMessage: "Failed to fetch room statistics",
    });
  },
};

export type {
  BattleSessionRequest,
  BattleSessionResponse,
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  RoomAvailabilityResponse,
  StartBattlePayload,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
} from "@/src/types/api";
