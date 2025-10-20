import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTimeout } from "usehooks-ts";

import { useBattleActions } from "@/src/hooks/useBattleActions";
import { useHostDetection } from "@/src/hooks/useHostDetection";
import { useRealtime } from "@/src/hooks/useRealtime";
import { useBattleStore } from "@/src/lib/battle-store";
import { BATTLE_SESSION_COOKIE } from "@/src/lib/session";

import { useBattleRoomState } from "./useRoomState";
import { useTimer } from "./useTimer";

export function useBattleLogic() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const roomId = useMemo(() => params?.id, [params]);
  const hasRedirectedRef = useRef(false);
  const accessDeniedRef = useRef(false);

  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Use the smaller hooks
  const {
    state,
    answerStatus,
    stateLoading,
    stateError,
    refresh,
    forceStateSync,
  } = useBattleRoomState();

  const { isHost } = useHostDetection(roomId, state);

  const {
    copyRoomLink,
    startBattle,
    submitAnswer,
    autoCloseRound,
    advanceFromScoreboard,
    formatTime,
    difficultyLabel,
    getDifficultyColor,
    getRoomStatusColor,
    setReadyStatus,
    toggleReadyStatus,
    startBattleLoading,
    submitAnswerLoading,
    advanceFromScoreboardLoading,
    readyStatusLoading,
  } = useBattleActions(roomId, state, refresh);

  const { timeLeft } = useTimer(state, autoCloseRound);

  // Initialize realtime with dependencies
  useRealtime(roomId, state, refresh, autoCloseRound);

  useEffect(() => {
    if (!stateError || accessDeniedRef.current) return;

    const err = stateError as Error & { status?: number; code?: string };
    const status = err.status;
    if (!status) return;

    if ([401, 403, 404].includes(status)) {
      accessDeniedRef.current = true;
      const store = useBattleStore.getState();
      let message = "Unable to access this battle room.";
      const notJoinedCodes = new Set(["MISSING_SESSION", "NOT_PARTICIPANT"]);
      if (notJoinedCodes.has(err.code ?? "") || [401, 403].includes(status)) {
        message = "You haven't joined this battle room yet.";
      } else if (status === 404) {
        message = "This battle room doesn't exist or is no longer available.";
      }
      store.addNotification(message);
      router.replace("/");
    }
  }, [stateError, router]);

  // Use Zustand store for UI state only
  const {
    // Game state
    gamePhase,
    answer,
    hasSubmitted,
    loading,
    copied,
    isProgressing,
    connectionState,
    connectionError,
    notifications,
    answeredCount,
    selectedChoiceId,
    currentScoreboard,

    // Actions
    // Note: Actions are handled by smaller hooks
  } = useBattleStore();

  // Reset copy state after 2 seconds using useTimeout
  useTimeout(
    () => {
      useBattleStore.getState().setCopied(false);
    },
    copied ? 2000 : null
  );

  // Redirect to results after 2.5 seconds using useTimeout
  useTimeout(
    () => {
      if (!roomId) return;
      router.replace(`/result/${roomId}`);
      setShouldRedirect(false);
    },
    shouldRedirect ? 2500 : null
  );

  // Compute whether server already recorded my answer (to avoid UI flicker)
  const mySessionId = useMemo(() => {
    if (state?.currentUser?.session_id) {
      return state.currentUser.session_id;
    }

    if (typeof document === "undefined") {
      return null;
    }

    const cookieMatch = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${BATTLE_SESSION_COOKIE}=`));

    return cookieMatch ? cookieMatch.split("=")[1] : null;
  }, [state?.currentUser?.session_id]);

  const serverMarkedAnswered = useMemo(() => {
    if (!answerStatus?.participants || !mySessionId) return null;
    const me = answerStatus.participants.find(
      (p: { session_id: string; has_answered: boolean }) =>
        p.session_id === mySessionId
    );
    return me?.has_answered ?? null;
  }, [answerStatus?.participants, mySessionId]);

  const iHaveAnswered = hasSubmitted || serverMarkedAnswered === true;

  const totalParticipants = useMemo(() => {
    if (answerStatus?.totalParticipants !== undefined) {
      return answerStatus.totalParticipants;
    }
    const participants = state?.participants || [];
    return participants.filter((p) => p.connection_status !== "offline").length;
  }, [answerStatus?.totalParticipants, state?.participants]);

  // Redirect when gamePhase becomes finished (most robust trigger)
  useEffect(() => {
    if (hasRedirectedRef.current) return;
    if (gamePhase !== "finished") return;
    if (state?.room?.status !== "finished") return;

    hasRedirectedRef.current = true;
    setShouldRedirect(true);
  }, [gamePhase, state?.room?.status]);

  return {
    // State values
    roomId,
    gamePhase,
    timeLeft,
    hasSubmitted,
    loading:
      loading || stateLoading || startBattleLoading || submitAnswerLoading,
    copied,
    isProgressing,
    connectionState,
    connectionError,
    state,
    notifications,
    answeredCount,
    totalParticipants,
    answerStatus,
    iHaveAnswered,
    answer,
    selectedChoiceId,

    // Functions
    copyRoomLink,
    refresh,
    forceStateSync,
    startBattle,
    submitAnswer,
    autoCloseRound,
    formatTime,
    difficultyLabel,
    getDifficultyColor,
    getRoomStatusColor,
    advanceFromScoreboard,
    setReadyStatus,
    toggleReadyStatus,

    // Derived values
    isHost: isHost(),
    scoreboard: currentScoreboard,
    advanceFromScoreboardLoading,
    readyStatusLoading,
  };
}
