import {
  useMutation,
  type UseMutationOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  battleApi,
  type CreateRoomPayload,
  type CreateRoomResponse,
  type JoinRoomPayload,
  type JoinRoomResponse,
  type StartBattlePayload,
  type SubmitAnswerPayload,
  type SubmitAnswerResponse,
} from '@/src/lib/api';
import { ensureSession } from '@/src/lib/session';
import { handleApiError } from '@/src/lib/client-error-handler';

// Query Keys
export const battleQueryKeys = {
  all: ['battle'] as const,
  rooms: () => [...battleQueryKeys.all, 'rooms'] as const,
  room: (roomId: string) => [...battleQueryKeys.rooms(), roomId] as const,
  roomState: (roomId: string) =>
    [...battleQueryKeys.room(roomId), 'state'] as const,
  answerStatus: (roomId: string) =>
    [...battleQueryKeys.room(roomId), 'answer-status'] as const,
  userAnswers: (roomId: string) =>
    [...battleQueryKeys.room(roomId), 'user-answers'] as const,
  scoreboard: (roomId: string) =>
    [...battleQueryKeys.room(roomId), 'scoreboard'] as const,
};

const showBattleNotification = (
  message: string,
  type?: 'error' | 'warning' | 'info'
) => {
  console.log(`[${type?.toUpperCase() || 'ERROR'}] ${message}`);
};

async function runWithBattleErrorHandling<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleApiError(error);
    if (error instanceof Error) {
      showBattleNotification(error.message);
    }
    throw error;
  }
}

type InvalidateSelector<TData, TVariables> = (params: {
  data: TData;
  variables: TVariables;
}) => readonly unknown[] | undefined;

type MutationSuccessHandler<TData, TVariables, TContext> = UseMutationOptions<
  TData,
  unknown,
  TVariables,
  TContext
>['onSuccess'];
type MutationErrorHandler<TData, TVariables, TContext> = UseMutationOptions<
  TData,
  unknown,
  TVariables,
  TContext
>['onError'];

interface BattleMutationConfig<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidate?: InvalidateSelector<TData, TVariables>[];
  onSuccess?: MutationSuccessHandler<TData, TVariables, TContext>;
  onError?: MutationErrorHandler<TData, TVariables, TContext>;
  errorLabel?: string;
}

function useBattleMutation<TData, TVariables, TContext = unknown>(
  config: BattleMutationConfig<TData, TVariables, TContext>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, unknown, TVariables, TContext>({
    mutationFn: variables =>
      runWithBattleErrorHandling(() => config.mutationFn(variables)),
    onSuccess: (data, variables, context) => {
      config.invalidate?.forEach(selector => {
        try {
          const queryKey = selector({ data, variables });
          if (queryKey && queryKey.length > 0) {
            queryClient.invalidateQueries({ queryKey });
          }
        } catch (err) {
          console.error('[Battle Mutation] Failed to invalidate query', err);
        }
      });

      if (config.onSuccess) {
        (
          config.onSuccess as (
            data: TData,
            variables: TVariables,
            context: TContext
          ) => void
        )(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      if (config.errorLabel) {
        console.error(config.errorLabel, error);
      }
      if (config.onError && context !== undefined) {
        (
          config.onError as (
            error: unknown,
            variables: TVariables,
            context: TContext
          ) => void
        )(error, variables, context);
      }
    },
  });
}

// Room State Query
export const useRoomState = (
  roomId: string | undefined,
  options?: { enabled?: boolean; refetchInterval?: number }
) => {
  return useQuery({
    queryKey: battleQueryKeys.roomState(roomId || ''),
    queryFn: () => battleApi.getRoomState(roomId!),
    enabled: !!roomId && options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: 0,
    gcTime: 0,
  });
};

// Answer Status Query
export const useAnswerStatus = (
  roomId: string | undefined,
  options?: { enabled?: boolean; refetchInterval?: number }
) => {
  return useQuery({
    queryKey: battleQueryKeys.answerStatus(roomId || ''),
    queryFn: () => battleApi.getAnswerStatus(roomId!),
    enabled: !!roomId && options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: 0,
    gcTime: 0,
  });
};

// User Answers Query
export const useUserAnswers = (
  roomId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: battleQueryKeys.userAnswers(roomId || ''),
    queryFn: () => battleApi.getUserAnswers(roomId!),
    enabled: !!roomId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Scoreboard Query
export const useScoreboard = (
  roomId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: battleQueryKeys.scoreboard(roomId || ''),
    queryFn: () => battleApi.getScoreboard(roomId!),
    enabled: !!roomId && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Room Stats Query (for results page)
export const useRoomStats = (
  roomId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: battleQueryKeys.roomState(roomId || ''),
    queryFn: () => battleApi.getRoomStats(roomId!),
    enabled: !!roomId && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Create Room Mutation
export const useCreateRoom = () => {
  return useBattleMutation<
    CreateRoomResponse,
    CreateRoomPayload & { skipSessionCreation?: boolean }
  >({
    mutationFn: async payload => {
      const { skipSessionCreation, ...roomPayload } = payload;

      if (!skipSessionCreation) {
        const sessionCreated = await ensureSession(roomPayload.hostDisplayName);
        if (!sessionCreated) {
          throw new Error('Failed to create session');
        }

        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return battleApi.createRoom(roomPayload);
    },
    invalidate: [() => battleQueryKeys.rooms()],
    errorLabel: 'Create room failed:',
  });
};

// Join Room Mutation
export const useJoinRoom = () => {
  return useBattleMutation<
    JoinRoomResponse & { roomId: string },
    {
      roomId: string;
      payload: JoinRoomPayload;
      skipSessionCreation?: boolean;
    }
  >({
    mutationFn: async ({ roomId, payload, skipSessionCreation = false }) => {
      const availability = await battleApi.checkRoomAvailability(roomId);
      if (!availability.joinable) {
        const message =
          availability.message ||
          (availability.status === 'finished'
            ? 'Battle ini sudah selesai.'
            : 'Room ini tidak menerima peserta baru saat ini.');

        throw {
          error: {
            code: 'ROOM_NOT_JOINABLE',
            message,
            retryable: false,
          },
        };
      }

      const resolvedRoomId = availability.roomId || roomId;

      if (!skipSessionCreation) {
        const sessionCreated = await ensureSession(payload.displayName);
        if (!sessionCreated) {
          throw new Error('Failed to create session');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const joinResponse = await battleApi.joinRoom(resolvedRoomId, payload);

      return {
        ...joinResponse,
        roomId: joinResponse.roomId || resolvedRoomId,
      };
    },
    invalidate: [
      ({ data, variables }) =>
        battleQueryKeys.roomState(data?.roomId || variables.roomId),
    ],
    errorLabel: 'Join room failed:',
  });
};

// Start Battle Mutation
export const useStartBattle = () => {
  return useBattleMutation<
    void,
    {
      roomId: string;
      payload: StartBattlePayload;
      headers?: Record<string, string>;
    }
  >({
    mutationFn: ({ roomId, payload, headers }) =>
      battleApi.startBattle(roomId, payload, headers),
    invalidate: [
      ({ variables }) => battleQueryKeys.roomState(variables.roomId),
    ],
    errorLabel: 'Start battle failed:',
  });
};

// Update ready status
export const useUpdateReadyStatus = () => {
  return useBattleMutation<void, { roomId: string; ready: boolean }>({
    mutationFn: ({ roomId, ready }) => battleApi.setReadyStatus(roomId, ready),
    invalidate: [
      ({ variables }) => battleQueryKeys.roomState(variables.roomId),
      ({ variables }) => battleQueryKeys.answerStatus(variables.roomId),
    ],
    errorLabel: 'Update ready status failed:',
  });
};

// Submit Answer Mutation
export const useSubmitAnswer = () => {
  return useBattleMutation<
    SubmitAnswerResponse,
    { roomId: string; roundNo: number; payload: SubmitAnswerPayload }
  >({
    mutationFn: ({ roomId, roundNo, payload }) =>
      battleApi.submitAnswer(roomId, roundNo, payload),
    invalidate: [
      ({ variables }) => battleQueryKeys.answerStatus(variables.roomId),
      ({ variables }) => battleQueryKeys.roomState(variables.roomId),
    ],
    errorLabel: 'Submit answer failed:',
  });
};

// Close Round Mutation
export const useCloseRound = () => {
  return useBattleMutation<void, { roomId: string; roundNo: number }>({
    mutationFn: ({ roomId, roundNo }) => battleApi.closeRound(roomId, roundNo),
    invalidate: [
      ({ variables }) => battleQueryKeys.roomState(variables.roomId),
      ({ variables }) => battleQueryKeys.answerStatus(variables.roomId),
    ],
    errorLabel: 'Close round failed:',
  });
};

// Reveal Next Round Mutation
export const useRevealNextRound = () => {
  return useBattleMutation<void, { roomId: string; roundNo: number }>({
    mutationFn: ({ roomId, roundNo }) =>
      battleApi.revealNextRound(roomId, roundNo),
    invalidate: [
      ({ variables }) => battleQueryKeys.roomState(variables.roomId),
    ],
    errorLabel: 'Reveal next round failed:',
  });
};

// Advance from scoreboard phase (host only)
export const useAdvanceFromScoreboard = () => {
  return useBattleMutation<
    { action: string; roundNo?: number },
    { roomId: string }
  >({
    mutationFn: ({ roomId }) => battleApi.advanceAfterScoreboard(roomId),
    invalidate: [
      ({ variables }) => battleQueryKeys.roomState(variables.roomId),
      ({ variables }) => battleQueryKeys.answerStatus(variables.roomId),
    ],
    errorLabel: 'Advance from scoreboard failed:',
  });
};

// Custom hook for refreshing battle data
export const useBattleRefresh = (roomId: string | undefined) => {
  const queryClient = useQueryClient();

  const refreshBattleData = async () => {
    if (!roomId) return;

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: battleQueryKeys.roomState(roomId),
      }),
      queryClient.invalidateQueries({
        queryKey: battleQueryKeys.answerStatus(roomId),
      }),
    ]);
  };

  return { refreshBattleData };
};
