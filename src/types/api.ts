export interface CreateRoomPayload {
  hostDisplayName: string;
  topic?: string;
  language: string;
  numQuestions: number;
  roundTimeSec: number;
  capacity: number;
  questionType: 'open-ended' | 'multiple-choice';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CreateRoomResponse {
  roomId: string;
  roomCode: string;
}

export interface JoinRoomPayload {
  displayName: string;
}

export interface JoinRoomResponse {
  participantId?: string;
  roomId?: string;
  success?: boolean;
  message?: string;
}

export interface RoomAvailabilityResponse {
  roomId: string;
  status: string;
  joinable: boolean;
  capacity?: number | null;
  currentParticipants?: number | null;
  message?: string;
  roomCode?: string;
  meta?: {
    topic?: string | null;
    language?: string | null;
    numQuestions?: number | null;
    difficulty?: string | null;
    roundTimeSec?: number | null;
  };
}

export interface BattleSessionRequest {
  display_name: string;
  fingerprint_hash?: string;
}

export interface BattleSessionResponse {
  sessionId: string;
  id: string;
  display_name: string;
  fingerprint_hash: string;
  created_at: string;
  last_active_at: string;
}

export interface StartBattlePayload {
  useAI: boolean;
}

export interface SubmitAnswerPayload {
  answer_text?: string;
  choice_id?: string;
  timeMs?: number;
}

export interface SubmitAnswerResponse {
  success: boolean;
  score?: number;
  feedback?: string;
}
