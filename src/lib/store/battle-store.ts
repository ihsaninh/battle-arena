import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { BattleState } from '@/src/types/battle';

export const useBattleStore = create<BattleState>()(
  persist(
    set => ({
      // Initial state
      gamePhase: 'waiting',
      answer: '',
      timeLeft: null,
      hasSubmitted: false,
      selectedChoiceId: null,
      loading: false,
      copied: false,
      isProgressing: false,
      connectionState: 'disconnected',
      connectionError: null,
      lastEventTime: Date.now(),
      isHostCache: null,
      tabId: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      showTeamReveal: false,
      teamRevealShownAt: null,
      state: null,
      notifications: [],
      answeredCount: 0,
      answerStatus: null,
      currentScoreboard: null,
      previousScoreboard: null,
      stuckDetectionTimerId: null,
      pollingIntervalId: null,
      forceProgressTimerId: null,
      refreshDebounceTimerId: null,

      // Actions
      setGamePhase: phase => set({ gamePhase: phase }),
      setAnswer: answer => set({ answer }),
      setTimeLeft: timeLeft => set({ timeLeft }),
      setHasSubmitted: hasSubmitted => set({ hasSubmitted }),
      setSelectedChoiceId: id => set({ selectedChoiceId: id }),
      setLoading: loading => set({ loading }),
      setCopied: copied => set({ copied }),
      setIsProgressing: isProgressing => set({ isProgressing }),
      setConnectionState: connectionState => set({ connectionState }),
      setConnectionError: connectionError => set({ connectionError }),
      setLastEventTime: lastEventTime => set({ lastEventTime }),
      setIsHostCache: isHostCache => set({ isHostCache }),
      setState: state => set({ state }),
      setNotifications: notifications => set({ notifications }),
      setAnsweredCount: answeredCount => set({ answeredCount }),
      setAnswerStatus: answerStatus => set({ answerStatus }),
      setCurrentScoreboard: currentScoreboard =>
        set(state => {
          const hasExisting = !!state.currentScoreboard;
          const nextPrevious = hasExisting
            ? state.currentScoreboard
            : state.previousScoreboard;

          return {
            previousScoreboard: currentScoreboard
              ? nextPrevious
              : (state.currentScoreboard ?? state.previousScoreboard),
            currentScoreboard,
          };
        }),
      resetScoreboard: () =>
        set({
          currentScoreboard: null,
          previousScoreboard: null,
        }),
      addNotification: message =>
        set(state => {
          // Prevent duplicate notifications (check last 3 notifications)
          const recentNotifications = state.notifications.slice(0, 3);
          if (recentNotifications.includes(message)) {
            return state; // Don't add duplicate
          }

          return {
            notifications: [message, ...state.notifications.slice(0, 2)],
          };
        }),
      clearTimers: () =>
        set(state => {
          // Clear existing timers
          if (state.stuckDetectionTimerId) {
            clearTimeout(state.stuckDetectionTimerId);
          }
          if (state.pollingIntervalId) {
            clearInterval(state.pollingIntervalId);
          }
          if (state.forceProgressTimerId) {
            clearTimeout(state.forceProgressTimerId);
          }
          if (state.refreshDebounceTimerId) {
            clearTimeout(state.refreshDebounceTimerId);
          }
          return {
            stuckDetectionTimerId: null,
            pollingIntervalId: null,
            forceProgressTimerId: null,
            refreshDebounceTimerId: null,
          };
        }),
      setParticipantReady: (sessionId, isReady) =>
        set(state => {
          const nextState = state.state
            ? {
                ...state.state,
                participants: state.state.participants?.map(participant =>
                  participant.session_id === sessionId
                    ? { ...participant, is_ready: isReady }
                    : participant
                ),
              }
            : state.state;

          const nextAnswerStatus = state.answerStatus
            ? {
                ...state.answerStatus,
                participants: state.answerStatus.participants.map(
                  participant =>
                    participant.session_id === sessionId
                      ? { ...participant, is_ready: isReady }
                      : participant
                ),
              }
            : state.answerStatus;

          return {
            state: nextState,
            answerStatus: nextAnswerStatus,
          };
        }),
      resetParticipantReadyStates: () =>
        set(state => {
          const nextState = state.state
            ? {
                ...state.state,
                participants: state.state.participants?.map(participant => ({
                  ...participant,
                  is_ready: false,
                })),
              }
            : state.state;

          const nextAnswerStatus = state.answerStatus
            ? {
                ...state.answerStatus,
                participants: state.answerStatus.participants.map(
                  participant => ({
                    ...participant,
                    is_ready: false,
                  })
                ),
              }
            : state.answerStatus;

          return {
            state: nextState,
            answerStatus: nextAnswerStatus,
          };
        }),
      setShowTeamReveal: show => set({ showTeamReveal: show }),
      setTimerIds: timerIds => set(timerIds),
    }),
    {
      name: 'battle-storage',
      partialize: state => ({
        isHostCache: state.isHostCache,
        tabId: state.tabId,
      }),
    }
  )
);
