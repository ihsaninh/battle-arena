import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  useAnswerStatus,
  useBattleRefresh,
  useRoomState,
} from '@/src/hooks/useBattleQueries';
import { useBattleStore } from '@/src/lib/store/battle-store';
import type { AnswerStatus, GamePhase, StateResp } from '@/src/types/battle';
import { BATTLE_SESSION_COOKIE } from '@/src/lib/database/session';

// Extend Window interface to include custom properties
declare global {
  interface Window {
    lastRoomChangeTime?: number;
    battleStateChecksum?: string;
    lastEventSequence?: number;
  }
}

// Helper function to determine correct gamePhase from server state
function determineGamePhaseFromServerState(state: StateResp): GamePhase {
  if (!state.room) return 'waiting';

  switch (state.room.status) {
    case 'waiting':
      return 'waiting';
    case 'finished':
      return 'finished';
    case 'active':
      // If room is active, check if there's an active round
      if (state.activeRound?.status === 'scoreboard') {
        return 'scoreboard';
      }

      if (state.activeRound?.status === 'active') {
        return 'answering';
      } else {
        return 'playing'; // Waiting for round to be revealed
      }
    default:
      return 'waiting';
  }
}

// State validation and checksum functions
function generateStateChecksum(state: StateResp): string {
  const keyData = {
    roomId: state.room?.id,
    roomStatus: state.room?.status,
    roundNo: state.activeRound?.roundNo,
    roundStatus: state.activeRound?.status,
    participantCount: state.participants?.length,
    currentUserId: state.currentUser?.session_id,
  };
  return btoa(JSON.stringify(keyData)).slice(0, 16);
}

function validateStateSync(state: StateResp, gamePhase: GamePhase): boolean {
  if (!state.room) return true; // Initial state

  const expectedPhase = determineGamePhaseFromServerState(state);
  const currentChecksum = generateStateChecksum(state);
  const storedChecksum = window.battleStateChecksum;

  // Check for phase mismatch
  if (expectedPhase !== gamePhase) {
    console.warn('[SYNC] Phase mismatch detected:', {
      expected: expectedPhase,
      current: gamePhase,
      state: state.room?.status,
    });
    return false;
  }

  // Check for state drift using checksum
  if (storedChecksum && storedChecksum !== currentChecksum) {
    console.warn('[SYNC] State drift detected:', {
      stored: storedChecksum,
      current: currentChecksum,
    });
    return false;
  }

  return true;
}

function recoverFromStateDesync(roomId: string, refresh: () => Promise<void>) {
  console.log('[SYNC] Initiating state recovery for room:', roomId);

  // Clear local state
  window.battleStateChecksum = undefined;
  window.lastEventSequence = undefined;

  // Force refresh from server
  setTimeout(() => {
    refresh().catch(err => {
      console.error('[SYNC] Recovery refresh failed:', err);
    });
  }, 1000);
}

export function useBattleRoomState(): {
  roomId: string | undefined;
  state: StateResp | undefined;
  answerStatus: AnswerStatus | undefined;
  stateLoading: boolean;
  stateError: unknown;
  refresh: (force?: boolean) => Promise<void>;
  forceStateSync: () => Promise<void>;
  lastValidRoundRef: React.MutableRefObject<number | null>;
} {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const roomId = useMemo(() => params?.id, [params]);
  const lastRoomIdRef = useRef<string | undefined>(undefined);

  // Detect room change and force reset all state
  useEffect(() => {
    if (roomId && roomId !== lastRoomIdRef.current) {
      // Clear TanStack Query cache for previous room to prevent conflicts
      if (lastRoomIdRef.current) {
        queryClient.removeQueries({
          queryKey: ['room-state', lastRoomIdRef.current],
        });
        queryClient.removeQueries({
          queryKey: ['answer-status', lastRoomIdRef.current],
        });
      }

      lastRoomIdRef.current = roomId;

      // Mark the time of room change to prevent immediate redirects
      window.lastRoomChangeTime = Date.now();

      // Only reset state for actual room changes, not page refreshes
      if (lastRoomIdRef.current !== undefined) {
        // Force reset all battle state immediately
        const store = useBattleStore.getState();
        store.setGamePhase('waiting');
        store.setHasSubmitted(false);
        store.setAnswer('');
        store.setSelectedChoiceId(null);
        store.setAnsweredCount(0);
        store.setIsProgressing(false);
        store.setState(null);
        store.setAnswerStatus(null);
        store.setNotifications([]);
        store.resetScoreboard();
      }
    }
  }, [roomId, queryClient]);

  // TanStack Query hooks
  const {
    data: state,
    isLoading: stateLoading,
    error: stateError,
  } = useRoomState(roomId, {
    enabled: !!roomId,
  });

  const { data: answerStatus } = useAnswerStatus(roomId, {
    enabled: !!roomId,
  });

  const { refreshBattleData } = useBattleRefresh(roomId);

  // Enhanced refresh function using TanStack Query with deduplication
  const refreshInProgress = useRef(false);
  const lastRefreshTime = useRef(0);

  const refresh = useCallback(
    async (force = false) => {
      const now = Date.now();

      // Prevent multiple simultaneous refresh requests
      if (refreshInProgress.current) {
        console.log('[POLL] Refresh already in progress, skipping');
        return;
      }

      // Less aggressive throttling for participant updates (unless forced)
      if (!force && now - lastRefreshTime.current < 500) {
        console.log('[POLL] Refresh throttled, too frequent');
        return;
      }

      refreshInProgress.current = true;
      lastRefreshTime.current = now;

      try {
        console.log('[POLL] Executing refresh', force ? '(forced)' : '');
        await refreshBattleData();
        useBattleStore.getState().setLastEventTime(now);

        // Validate state after refresh
        const currentState = useBattleStore.getState().state;
        if (currentState) {
          const isValid = validateStateSync(
            currentState,
            useBattleStore.getState().gamePhase
          );
          if (!isValid) {
            console.warn(
              '[SYNC] State validation failed after refresh, attempting recovery'
            );
            // Don't call recoverFromStateDesync here to avoid infinite loop
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[SYNC] Refresh error:', message);
        useBattleStore.getState().addNotification(`Refresh error: ${message}`);

        // Trigger recovery on refresh failure
        if (roomId) {
          setTimeout(() => recoverFromStateDesync(roomId, refresh), 2000);
        }
      } finally {
        refreshInProgress.current = false;
      }
    },
    [refreshBattleData, roomId]
  );

  // Manual state recovery function for user-triggered sync
  const forceStateSync = async () => {
    console.log('[SYNC] Manual state sync requested');
    useBattleStore.getState().addNotification('Syncing with server...');

    // Clear local state cache
    window.battleStateChecksum = undefined;
    window.lastEventSequence = undefined;

    // Force complete refresh
    try {
      await queryClient.invalidateQueries({ queryKey: ['battle'] });
      await refresh();
      useBattleStore
        .getState()
        .addNotification('State synchronized successfully');
    } catch (err) {
      console.error('[SYNC] Manual sync failed:', err);
      useBattleStore
        .getState()
        .addNotification('Sync failed, please refresh the page');
    }
  };

  // Refs to track previous values and prevent infinite loops
  const prevStateRef = useRef<StateResp | null>(null);
  const prevAnswerStatusRef = useRef<AnswerStatus | null>(null);
  const prevRoundNoRef = useRef<number | null>(null);
  const lastValidRoundRef = useRef<number | null>(null);

  // Update Zustand store when TanStack Query data changes
  useEffect(() => {
    if (state && state !== prevStateRef.current) {
      prevStateRef.current = state;
      useBattleStore.getState().setState(state);

      // Store client time when state was received for accurate timer calculation
      if (state.serverTime) {
        state.clientTimeReceived = Date.now();
      }

      // Update state checksum for sync validation
      const newChecksum = generateStateChecksum(state);
      window.battleStateChecksum = newChecksum;

      // CRITICAL: Sync gamePhase with server state to prevent desync issues
      const serverGamePhase = determineGamePhaseFromServerState(state);
      const currentGamePhase = useBattleStore.getState().gamePhase;
      if (serverGamePhase !== currentGamePhase) {
        console.warn('[SYNC] Phase sync triggered:', {
          from: currentGamePhase,
          to: serverGamePhase,
          reason: 'server_state_update',
        });
        useBattleStore.getState().setGamePhase(serverGamePhase);
      }

      // Validate state synchronization
      if (!validateStateSync(state, currentGamePhase)) {
        console.error('[SYNC] State desync detected, initiating recovery');
        recoverFromStateDesync(roomId || '', refresh);
      }

      // CRITICAL: Validate round progression to prevent regression
      const currentRoundNo = state.activeRound?.roundNo;
      if (currentRoundNo !== undefined) {
        const prevRoundNo = prevRoundNoRef.current;
        const lastValidRound = lastValidRoundRef.current;

        // Only accept round progression that moves forward or stays the same
        if (prevRoundNo !== null && lastValidRound !== null) {
          if (currentRoundNo < lastValidRound) {
            // Force refresh to get correct server state
            setTimeout(() => {
              refresh();
            }, 500);
            return;
          }
        }

        // Update tracking refs
        prevRoundNoRef.current = currentRoundNo;
        if (
          lastValidRoundRef.current === null ||
          currentRoundNo >= lastValidRoundRef.current
        ) {
          lastValidRoundRef.current = currentRoundNo;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, roomId]);

  useEffect(() => {
    if (answerStatus && answerStatus !== prevAnswerStatusRef.current) {
      prevAnswerStatusRef.current = answerStatus;
      const store = useBattleStore.getState();
      store.setAnswerStatus(answerStatus);
      store.setAnsweredCount(answerStatus.totalAnswered);

      // Ensure local submitted state reflects server truth for current user
      try {
        const mySessionId =
          state?.currentUser?.session_id ||
          document.cookie
            .split('; ')
            .find(row => row.startsWith(`${BATTLE_SESSION_COOKIE}=`))
            ?.split('=')[1];
        if (mySessionId && Array.isArray(answerStatus.participants)) {
          const me = answerStatus.participants.find(
            (p: { session_id: string; has_answered: boolean }) =>
              p.session_id === mySessionId
          );
          if (me?.has_answered) {
            store.setHasSubmitted(true);
          }
        }
      } catch {
        // ignore mapping issues, UI will still work with local state
      }
    }
  }, [answerStatus, state?.currentUser?.session_id]);

  // Additional sync logic for active rooms to ensure proper phase transitions
  useEffect(() => {
    if (state?.room?.status === 'active') {
      // Room is active, determine correct phase
      const correctPhase = determineGamePhaseFromServerState(state);
      const currentPhase = useBattleStore.getState().gamePhase;
      if (currentPhase !== correctPhase) {
        useBattleStore.getState().setGamePhase(correctPhase);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.room?.status, state?.activeRound]);

  // Ensure phase resets to waiting when entering a fresh room
  useEffect(() => {
    if (state?.room?.status === 'waiting') {
      const store = useBattleStore.getState();
      if (store.gamePhase !== 'waiting') {
        store.setGamePhase('waiting');
      }
      store.setHasSubmitted(false);
      store.setAnswer('');
      try {
        if (typeof store.setSelectedChoiceId === 'function') {
          store.setSelectedChoiceId(null);
        }
      } catch {}
    }
  }, [state?.room?.status]);

  // Gentle polling when in answering phase but question not loaded (avoid interference with round transitions)
  useEffect(() => {
    const store = useBattleStore.getState();
    if (
      store.gamePhase === 'answering' &&
      state?.activeRound?.status === 'active' &&
      !state?.activeRound?.question
    ) {
      // Only poll if we haven't had a recent event (avoid interfering with round transitions)
      const lastEventTime = store.lastEventTime;
      const timeSinceLastEvent = Date.now() - lastEventTime;

      // Wait at least 3 seconds after last event before starting gentle polling
      if (timeSinceLastEvent > 3000) {
        console.log(
          '[SYNC] Question missing in answering phase, starting gentle polling'
        );
        const interval = setInterval(() => {
          // Check again if we still need to poll (might have been resolved by round transition)
          const currentStore = useBattleStore.getState();
          if (
            currentStore.gamePhase === 'answering' &&
            currentStore.state?.activeRound?.status === 'active' &&
            !currentStore.state?.activeRound?.question
          ) {
            refresh(true);
          } else {
            // Question loaded or phase changed, stop polling
            clearInterval(interval);
          }
        }, 5000); // Poll every 5 seconds (less aggressive)

        return () => clearInterval(interval);
      }
    }
  }, [state?.activeRound?.question, state?.activeRound?.status, refresh]);

  // Cleanup refs when component unmounts
  useEffect(() => {
    return () => {
      prevStateRef.current = null;
      prevAnswerStatusRef.current = null;
      prevRoundNoRef.current = null;
      lastValidRoundRef.current = null;
    };
  }, []);

  return {
    roomId,
    state,
    answerStatus,
    stateLoading,
    stateError,
    refresh,
    forceStateSync,
    lastValidRoundRef,
  };
}
