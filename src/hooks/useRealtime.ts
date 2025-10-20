import type { RealtimeChannel } from "@supabase/realtime-js";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDebounceCallback, useInterval } from "usehooks-ts";

import { battleRequest } from "@/src/lib/api-request";
import { useBattleStore } from "@/src/lib/battle-store";
import { connectionMonitor } from "@/src/lib/connection-monitor";
import {
  createEnhancedRoomChannel,
  getConnectionStats,
} from "@/src/lib/realtime";
import type { StateResp } from "@/src/types/battle";
import { BATTLE_SESSION_COOKIE } from "@/src/lib/session";

export function useRealtime(
  roomId: string | undefined,
  state: StateResp | undefined,
  refresh: (force?: boolean) => Promise<void>,
  autoCloseRound: () => Promise<void>
) {
  const {
    gamePhase,
    setGamePhase,
    setLastEventTime,
    setConnectionState,
    setIsProgressing,
    addNotification,
    clearTimers,
    setTimerIds,
    setParticipantReady,
    resetParticipantReadyStates,
  } = useBattleStore();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isChannelSubscribedRef = useRef(false);

  const currentUser = state?.currentUser;

  const sessionId = useMemo(() => {
    if (currentUser?.session_id) {
      return currentUser.session_id;
    }
    if (typeof document === "undefined") {
      return null;
    }
    const cookieMatch = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${BATTLE_SESSION_COOKIE}=`));
    return cookieMatch ? cookieMatch.split("=")[1] : null;
  }, [currentUser]);

  const presenceEnabled = Boolean(roomId && sessionId);

  const presenceMetadata = useMemo(() => {
    if (!presenceEnabled || !sessionId) {
      return null;
    }

    const participant = state?.participants?.find(
      (p) => p.session_id === sessionId
    );

    return {
      status: "online" as const,
      displayName: currentUser?.display_name ?? participant?.display_name,
      isHost: currentUser?.is_host ?? participant?.is_host ?? false,
      participantId: participant?.participantId ?? undefined,
      roomId,
    };
  }, [
    presenceEnabled,
    roomId,
    sessionId,
    currentUser?.display_name,
    currentUser?.is_host,
    state?.participants,
  ]);

  const latestPresenceMetadataRef = useRef(presenceMetadata);
  useEffect(() => {
    latestPresenceMetadataRef.current = presenceMetadata;
  }, [presenceMetadata]);

  useEffect(() => {
    if (
      !presenceEnabled ||
      !presenceMetadata ||
      !channelRef.current ||
      !isChannelSubscribedRef.current
    ) {
      return;
    }

    channelRef.current
      .track(presenceMetadata)
      .catch((err) => console.error("[PRESENCE] Metadata update failed", err));
  }, [presenceEnabled, presenceMetadata]);

  const presenceKey = presenceEnabled ? sessionId ?? undefined : undefined;

  const presencePing = useCallback(
    async (status: "online" | "offline") => {
      if (presenceEnabled || typeof window === "undefined" || !roomId) {
        return;
      }
      try {
        await battleRequest(`/rooms/${roomId}/presence`, {
          method: "POST",
          body: { status },
          keepalive: status === "offline",
        });
      } catch (err) {
        const error = err as Error & { status?: number };
        if (typeof error?.status === "number") {
          console.warn(
            `[PRESENCE] Ping failed with status ${error.status}`,
            error
          );
        } else {
          console.error("[PRESENCE] Ping error:", err);
        }
      }
    },
    [presenceEnabled, roomId]
  );

  const presencePingRef = useRef(presencePing);
  useEffect(() => {
    presencePingRef.current = presencePing;
  }, [presencePing]);

  const clearStuckDetectionTimer = useCallback(() => {
    const { stuckDetectionTimerId } = useBattleStore.getState();
    if (stuckDetectionTimerId) {
      clearTimeout(stuckDetectionTimerId);
      setTimerIds({ stuckDetectionTimerId: null });
    }
  }, [setTimerIds]);

  const clearForceProgressTimer = useCallback(() => {
    const { forceProgressTimerId } = useBattleStore.getState();
    if (forceProgressTimerId) {
      clearTimeout(forceProgressTimerId);
      setTimerIds({ forceProgressTimerId: null });
    }
  }, [setTimerIds]);

  // Refs for connection state tracking
  const prevConnectionStateRef = useRef<string | null>(null);
  const prevGamePhaseRef = useRef<string | null>(null);

  // Refs for timeout tracking to prevent memory leaks
  const playerJoinedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const questionLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roundClosedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      if (prevConnectionStateRef.current === "disconnected") return;
      prevConnectionStateRef.current = "disconnected";
      setConnectionState("disconnected");
      if (!presenceEnabled) {
        presencePing("offline");
      }
    };

    const handleOnline = () => {
      if (
        prevConnectionStateRef.current === "connected" ||
        prevConnectionStateRef.current === "reconnecting"
      ) {
        // Supabase callbacks will update to connected; avoid duplicate state churn
        return;
      }

      prevConnectionStateRef.current = "reconnecting";
      setConnectionState("reconnecting");

      if (!roomId) return;
      refreshRef
        .current?.(true)
        .then(() => {
          if (prevConnectionStateRef.current !== "connected") {
            prevConnectionStateRef.current = "connected";
            setConnectionState("connected");
          }
          if (!presenceEnabled) {
            presencePing("online");
          }
        })
        .catch((err) => {
          console.error(
            "[ONLINE] Failed to refresh after regaining connection:",
            err
          );
        });
    };

    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [presenceEnabled, presencePing, roomId, setConnectionState]);

  // Refs for polling
  const pollingBackupCallback = () => {
    const last = useBattleStore.getState().lastEventTime;
    const timeSinceLastEvent = Date.now() - last;

    // Fixed threshold for backup polling
    const threshold = 45000;

    if (timeSinceLastEvent > threshold) {
      refresh(true); // Force refresh for backup polling
    }
  };

  // Run polling backup only when in active game phases
  const shouldRunPolling =
    roomId && (gamePhase === "answering" || gamePhase === "playing");
  const pollingInterval = shouldRunPolling
    ? gamePhase === "answering"
      ? 10000
      : 30000
    : null; // 10 seconds for answering, 30 for playing
  useInterval(pollingBackupCallback, pollingInterval);

  useInterval(
    () => {
      presencePing("online");
    },
    !presenceEnabled && roomId ? 5000 : null
  );

  useEffect(() => {
    if (!roomId || presenceEnabled) return;
    presencePing("online");
  }, [presenceEnabled, presencePing, roomId]);

  // Production fallback: aggressive polling for participant updates in waiting phase
  const productionParticipantPolling = () => {
    if (
      process.env.NODE_ENV === "production" &&
      roomId &&
      gamePhase === "waiting"
    ) {
      const lastEventTime = useBattleStore.getState().lastEventTime;
      const timeSinceLastEvent = Date.now() - lastEventTime;

      // Poll every 3 seconds in production waiting phase to catch missed participant joins
      if (timeSinceLastEvent > 3000) {
        refresh(true).catch((err) => {
          console.error("[PRODUCTION_POLL] Participant polling failed:", err);
        });
      }
    }
  };

  // Run production participant polling every 3 seconds when in waiting phase
  const shouldRunParticipantPolling =
    process.env.NODE_ENV === "production" && roomId && gamePhase === "waiting";
  useInterval(
    productionParticipantPolling,
    shouldRunParticipantPolling ? 3000 : null
  );

  // Debounced refresh using useDebounceCallback
  const debouncedRefresh = useDebounceCallback(() => {
    refresh();
  }, 500);

  // Subscribe to realtime channel once per room
  useEffect(() => {
    if (!roomId) return;

    // Start connection monitoring
    connectionMonitor.startMonitoring();

    // Initial fetch once when room mounts
    refresh();

    // Enhanced realtime setup with reconnection
    const ch = createEnhancedRoomChannel(
      String(roomId),
      () => {
        if (prevConnectionStateRef.current !== "connected") {
          prevConnectionStateRef.current = "connected";
          setConnectionState("connected");
        }
        refresh();
      },
      presenceKey
    );

    // Production connection health monitoring
    let connectionHealthCheckInterval: NodeJS.Timeout | null = null;

    // Handle connection errors
    if (!ch) {
      console.error(`❌ Failed to create channel for room:${roomId}`);
      const errorMsg = "Connection error. Please refresh the page.";
      addNotification(errorMsg);
      setConnectionState("disconnected");
      return;
    }

    channelRef.current = ch;
    isChannelSubscribedRef.current = false;

    if (presenceEnabled) {
      ch.on("presence", { event: "sync" }, () => {
        setLastEventTime(Date.now());
      });

      ch.on("presence", { event: "join" }, ({ newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          setLastEventTime(Date.now());
        }
      });

      ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
        if (leftPresences && leftPresences.length > 0) {
          setLastEventTime(Date.now());
        }
      });
    }

    if (process.env.NODE_ENV === "production") {
      let lastHealthyEvent = Date.now();
      let missedEventsCount = 0;

      const updateHealthTimestamp = () => {
        lastHealthyEvent = Date.now();
        missedEventsCount = 0;
      };

      connectionHealthCheckInterval = setInterval(() => {
        const timeSinceLastEvent = Date.now() - lastHealthyEvent;
        const timeSinceLastRefresh =
          Date.now() - useBattleStore.getState().lastEventTime;

        if (timeSinceLastEvent > 15000 && timeSinceLastRefresh > 15000) {
          missedEventsCount++;
          console.warn(
            `[CONNECTION_HEALTH] Missed events for ${timeSinceLastEvent}ms, count: ${missedEventsCount}`
          );

          if (missedEventsCount >= 2) {
            console.warn(
              "[CONNECTION_HEALTH] Forcing refresh due to missed events"
            );
            refresh(true).catch((err) => {
              console.error(
                "[CONNECTION_HEALTH] Health check refresh failed:",
                err
              );
            });
            missedEventsCount = 0;
          }
        } else {
          missedEventsCount = 0;
        }
      }, 10000);

      ch.on("broadcast", { event: "*" }, updateHealthTimestamp);
    }

    // Set up error handling for the channel
    let errorCount = 0;
    const maxErrors = 3;

    const handleError = () => {
      errorCount++;

      if (errorCount >= maxErrors) {
        console.error(`💥 Too many connection errors for room:${roomId}`);
        addNotification("Connection unstable. Please refresh the page.");
        setConnectionState("disconnected");
        prevConnectionStateRef.current = "disconnected";
      }
    };

    if (ch) {
      if (prevConnectionStateRef.current !== "connected") {
        prevConnectionStateRef.current = "connected";
        setConnectionState("connected");
      }

      ch.on("broadcast", { event: "player_joined" }, () => {
        // Simplified: Skip sequence checking to reduce complexity
        setLastEventTime(Date.now());

        // Clear any existing timeout
        if (playerJoinedTimeoutRef.current) {
          clearTimeout(playerJoinedTimeoutRef.current);
        }

        // Immediate refresh for participant updates - critical for UI state
        refresh(true).catch((err) => {
          console.error("[PLAYER_JOINED] Refresh failed:", err);

          // Production fallback: retry refresh after delay
          if (process.env.NODE_ENV === "production") {
            console.warn(
              "[PLAYER_JOINED] Production fallback: retrying refresh in 2s"
            );
            setTimeout(() => {
              refresh(true).catch((retryErr) => {
                console.error(
                  "[PLAYER_JOINED] Production fallback refresh also failed:",
                  retryErr
                );
              });
            }, 2000);
          }
        });

        // Production safeguard: additional refresh after 3 seconds to ensure state is updated
        if (process.env.NODE_ENV === "production") {
          playerJoinedTimeoutRef.current = setTimeout(() => {
            console.warn(
              "[PLAYER_JOINED] Production safeguard: additional refresh"
            );
            refresh(true).catch((err) => {
              console.error(
                "[PLAYER_JOINED] Production safeguard refresh failed:",
                err
              );
            });
          }, 3000);
        }
      });

      ch.on("broadcast", { event: "participant_status" }, () => {
        refresh(true);
      });

      ch.on("broadcast", { event: "participant_ready" }, (payload) => {
        const update = payload?.payload;
        type ReadyUpdate = {
          sessionId?: string;
          session_id?: string;
          isReady?: boolean;
        };

        const updates: ReadyUpdate[] = Array.isArray(update?.updates)
          ? update.updates
          : update
          ? [update]
          : [];

        if (!updates.length) {
          return;
        }

        updates.forEach((item) => {
          const sessionId =
            (item?.sessionId as string | undefined) ||
            (item?.session_id as string | undefined);
          const isReady = item?.isReady as boolean | undefined;

          if (!sessionId || typeof isReady !== "boolean") {
            return;
          }

          setParticipantReady(sessionId, isReady);
        });

        setLastEventTime(Date.now());
      });

      ch.on("broadcast", { event: "host_changed" }, (payload) => {
        const nextHostSession = payload?.payload?.sessionId as
          | string
          | undefined;
        const hostDisplayName = payload?.payload?.displayName as
          | string
          | undefined;

        const storeState = useBattleStore.getState();
        const mySessionId = storeState.state?.currentUser?.session_id;

        storeState.setIsHostCache(nextHostSession === mySessionId);

        if (nextHostSession === mySessionId) {
          addNotification("You are now the host.");
        } else if (hostDisplayName) {
          addNotification(`${hostDisplayName} is now the host.`);
        } else {
          addNotification("The host role has been reassigned.");
        }

        refresh(true);
      });

      ch.on("broadcast", { event: "room_started" }, () => {
        setLastEventTime(Date.now());
        resetParticipantReadyStates();

        // Transition to playing on room start
        if (prevGamePhaseRef.current !== "playing") {
          prevGamePhaseRef.current = "playing";
          setGamePhase("playing");
        }

        // Clear any existing stuck detection timer
        clearStuckDetectionTimer();

        // Clear any existing force progress timer
        clearForceProgressTimer();

        // Simplified stuck detection - single timer with single retry
        const stuckTimer = setTimeout(() => {
          const currentState = useBattleStore.getState();
          if (
            currentState.gamePhase === "playing" &&
            !currentState.state?.activeRound
          ) {
            console.warn(
              "[STUCK] First round not revealed, attempting recovery"
            );
            refresh(true);

            // Single retry after 5 seconds
            const retryTimer = setTimeout(() => {
              const retryState = useBattleStore.getState();
              if (
                retryState.gamePhase === "playing" &&
                !retryState.state?.activeRound
              ) {
                console.warn("[STUCK] Recovery failed, forcing refresh");
                addNotification("Attempting to recover from stuck state...");
                refresh(true);
              }
            }, 5000);
            setTimerIds({ forceProgressTimerId: retryTimer });
          }
        }, 10000); // Reduced from 15s to 10s
        setTimerIds({ stuckDetectionTimerId: stuckTimer });

        refresh();
      });

      ch.on("broadcast", { event: "round_revealed" }, () => {
        // Simplified: Skip sequence checking to reduce complexity
        setLastEventTime(Date.now());

        // Only proceed if room is still active
        if (useBattleStore.getState().state?.room?.status !== "active") {
          return;
        }

        // Reset form state immediately for new round
        useBattleStore.getState().setHasSubmitted(false);
        useBattleStore.getState().setAnswer("");
        useBattleStore.getState().setSelectedChoiceId(null);
        useBattleStore.getState().setAnsweredCount(0);
        useBattleStore.getState().setCurrentScoreboard(null);
        setIsProgressing(false);

        // Clear existing timers
        clearStuckDetectionTimer();
        clearForceProgressTimer();
        if (questionLoadTimeoutRef.current) {
          clearTimeout(questionLoadTimeoutRef.current);
        }

        // Set phase to answering
        if (prevGamePhaseRef.current !== "answering") {
          prevGamePhaseRef.current = "answering";
          setGamePhase("answering");
        }

        // Immediate refresh for round transitions
        refresh(true);
        setLastEventTime(Date.now());

        // Single safety timeout for question loading
        questionLoadTimeoutRef.current = setTimeout(() => {
          const currentState = useBattleStore.getState();
          if (
            currentState.gamePhase === "answering" &&
            !currentState.state?.activeRound?.question
          ) {
            console.warn("[QUESTION_LOAD] Forcing refresh after delay");
            refresh(true);
          }
        }, 1000);
      });

      ch.on("broadcast", { event: "answer_received" }, () => {
        setLastEventTime(Date.now());
        debouncedRefresh();
      });

      ch.on("broadcast", { event: "all_participants_answered" }, () => {
        setLastEventTime(Date.now());

        // If I'm the host, trigger auto-close after a short delay
        const isHost = useBattleStore.getState().isHostCache;
        if (isHost) {
          if (autoCloseTimeoutRef.current) {
            clearTimeout(autoCloseTimeoutRef.current);
          }
          autoCloseTimeoutRef.current = setTimeout(() => {
            const currentState = useBattleStore.getState().state;
            if (currentState?.activeRound?.status === "active") {
              autoCloseRound();
            }
          }, 2000);
        }

        refresh();
      });

      ch.on("broadcast", { event: "round_closed" }, (p) => {
        setLastEventTime(Date.now());
        const payload = p?.payload ?? {};

        if (payload?.stage === "scoreboard") {
          clearStuckDetectionTimer();
          if (roundClosedTimeoutRef.current) {
            clearTimeout(roundClosedTimeoutRef.current);
            roundClosedTimeoutRef.current = null;
          }

          const store = useBattleStore.getState();
          store.setCurrentScoreboard({
            roundNo: Number(payload.roundNo) || 0,
            entries: Array.isArray(payload.scoreboard)
              ? payload.scoreboard
              : [],
            reason: payload.reason,
            generatedAt: payload.generatedAt,
            hasMoreRounds: payload.hasMoreRounds,
            question: payload.question ?? null,
            answers: Array.isArray(payload.answers) ? payload.answers : [],
          });
          store.setGamePhase("scoreboard");
          prevGamePhaseRef.current = "scoreboard";
          store.setIsProgressing(false);
          store.setHasSubmitted(false);
          store.setAnsweredCount(0);
          store.setTimeLeft(null);

          debouncedRefresh();
          refresh(true);
          return;
        }

        const roundNo = payload?.roundNo || "?";
        const totalRounds =
          useBattleStore.getState().state?.room?.num_questions ?? 0;

        if (Number(roundNo) >= totalRounds) {
          return;
        }

        clearStuckDetectionTimer();
        if (roundClosedTimeoutRef.current) {
          clearTimeout(roundClosedTimeoutRef.current);
        }

        roundClosedTimeoutRef.current = setTimeout(() => {
          const currentState = useBattleStore.getState();
          if (currentState.gamePhase === "playing") {
            refresh(true);
          }
        }, 8000);
        setTimerIds({ stuckDetectionTimerId: roundClosedTimeoutRef.current });

        debouncedRefresh();
      });

      ch.on("broadcast", { event: "match_finished" }, (payload) => {
        setLastEventTime(Date.now());
        setIsProgressing(false);
        useBattleStore.getState().resetScoreboard();

        const finishReason = payload?.payload?.reason as string | undefined;
        if (finishReason === "opponent_disconnected") {
          addNotification("Battle selesai karena lawan terputus.");
        }

        // Transition to finished
        if (prevGamePhaseRef.current !== "finished") {
          prevGamePhaseRef.current = "finished";
          setGamePhase("finished");
        }

        // Clear timers
        clearStuckDetectionTimer();

        refresh();
      });

      ch.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          isChannelSubscribedRef.current = true;
          if (prevConnectionStateRef.current !== "connected") {
            prevConnectionStateRef.current = "connected";
            setConnectionState("connected");
          }
          if (process.env.NODE_ENV !== "production") {
            console.log(`✅ Successfully connected to room:${roomId}`);
          }
          errorCount = 0;
          if (presenceEnabled) {
            const metadata = latestPresenceMetadataRef.current;
            if (metadata) {
              ch.track(metadata).catch((trackErr) => {
                console.error("[PRESENCE] Track failed:", trackErr);
              });
            }
          } else {
            presencePingRef.current?.("online");
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          isChannelSubscribedRef.current = false;
          console.error(`❌ Connection error for room:${roomId}`, err);
          const isOnline =
            typeof navigator === "undefined" ? true : navigator.onLine;

          const nextState = isOnline ? "reconnecting" : "disconnected";

          if (prevConnectionStateRef.current !== nextState) {
            prevConnectionStateRef.current = nextState;
            setConnectionState(nextState);
            addNotification("Connection lost. Attempting to reconnect...");
          }

          handleError();
        }
      });

      return () => {
        // Enhanced cleanup
        if (ch) {
          if (presenceEnabled && isChannelSubscribedRef.current) {
            ch.untrack().catch((untrackErr) => {
              console.warn("[PRESENCE] Failed to untrack presence", untrackErr);
            });
          }
          ch.unsubscribe()
            .then(() => {
              const connectionStatsAfter = getConnectionStats();
              if (process.env.NODE_ENV !== "production") {
                console.log(
                  `✅ Successfully unsubscribed from room:${roomId}`,
                  connectionStatsAfter
                );
              }
            })
            .catch((err) => {
              console.error(`❌ Error unsubscribing from room:${roomId}`, err);
            });
        }
        channelRef.current = null;
        isChannelSubscribedRef.current = false;

        // Stop connection monitoring
        connectionMonitor.stopMonitoring();

        // Clear timers
        clearTimers();

        // Reset refs
        prevConnectionStateRef.current = null;
        prevGamePhaseRef.current = null;

        // Clean up localStorage
        if (
          roomId &&
          localStorage.getItem(`battle_host_tab_${roomId}`) ===
            useBattleStore.getState().tabId
        ) {
          localStorage.removeItem(`battle_host_tab_${roomId}`);
          localStorage.removeItem(`battle_host_session_${roomId}`);
        }

        // Clear all tracked timeouts
        if (playerJoinedTimeoutRef.current) {
          clearTimeout(playerJoinedTimeoutRef.current);
          playerJoinedTimeoutRef.current = null;
        }
        if (questionLoadTimeoutRef.current) {
          clearTimeout(questionLoadTimeoutRef.current);
          questionLoadTimeoutRef.current = null;
        }
        if (autoCloseTimeoutRef.current) {
          clearTimeout(autoCloseTimeoutRef.current);
          autoCloseTimeoutRef.current = null;
        }
        if (roundClosedTimeoutRef.current) {
          clearTimeout(roundClosedTimeoutRef.current);
          roundClosedTimeoutRef.current = null;
        }

        // Clear production connection health check interval
        if (connectionHealthCheckInterval) {
          clearInterval(connectionHealthCheckInterval);
          connectionHealthCheckInterval = null;
        }

        // Clear existing timers from store
        clearStuckDetectionTimer();
        clearForceProgressTimer();
        clearTimers();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, presenceKey]);
}
