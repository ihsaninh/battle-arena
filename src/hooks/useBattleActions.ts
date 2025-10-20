import { useRef } from "react";

import {
  useAdvanceFromScoreboard,
  useCloseRound,
  useStartBattle,
  useSubmitAnswer,
  useUpdateReadyStatus,
} from "@/src/hooks/useBattleQueries";
import { useBattleStore } from "@/src/lib/battle-store";
import {
  formatBattleTime,
  getDifficultyColor,
  getDifficultyLabel,
  getRoomStatusColor,
} from "@/src/lib/formatters";
import type { StateResp } from "@/src/types/battle";

export function useBattleActions(
  roomId: string | undefined,
  state: StateResp | undefined,
  refresh: () => Promise<void>
) {
  const {
    gamePhase,
    answer,
    selectedChoiceId,
    hasSubmitted,
    isProgressing,
    setGamePhase,
    setHasSubmitted,
    setAnswer,
    setSelectedChoiceId,
    setIsProgressing,
    addNotification,
    tabId,
    setParticipantReady,
    resetParticipantReadyStates,
  } = useBattleStore();

  // Mutations
  const startBattleMutation = useStartBattle();
  const submitAnswerMutation = useSubmitAnswer();
  const closeRoundMutation = useCloseRound();
  const advanceFromScoreboardMutation = useAdvanceFromScoreboard();
  const updateReadyMutation = useUpdateReadyStatus();

  // Request deduplication for answer submissions
  const submitInProgress = useRef(false);
  const lastSubmitTime = useRef(0);

  const copyRoomLink = () => {
    if (!roomId) {
      addNotification("Room is still loading – try again in a moment.");
      return;
    }

    const roomCode = state?.room?.room_code;
    if (!roomCode) {
      addNotification("Room code belum tersedia. Coba lagi sebentar lagi.");
      return;
    }

    const link = `${
      window.location.origin
    }/join?roomCode=${encodeURIComponent(roomCode)}`;

    navigator.clipboard
      .writeText(link)
      .then(() => {
        useBattleStore.getState().setCopied(true);
        addNotification("Room link copied to clipboard!");
      })
      .catch(() => {
        addNotification("Failed to copy link. Please copy it manually.");
      });
  };

  const startBattle = async () => {
    const isHost = useBattleStore.getState().isHostCache;
    if (!isHost) {
      addNotification("Only the host can start the battle!");
      return;
    }

    // Check if battle is already started to prevent duplicate notifications
    if (state?.room?.status === "active" || gamePhase === "playing") {
      return;
    }

    const snapshot = useBattleStore.getState();
    const participants =
      snapshot.state?.participants ?? state?.participants ?? [];
    const pendingParticipants = participants.filter(
      (p) => !p.is_host && p.connection_status !== "offline" && !p.is_ready
    );
    if (pendingParticipants.length > 0) {
      const names = pendingParticipants
        .map((p) => p.display_name || "Participant")
        .join(", ");
      addNotification(`Still waiting for everyone to be ready: ${names}.`);
      return;
    }

    try {
      await startBattleMutation.mutateAsync({
        roomId: roomId!,
        payload: { useAI: true },
        headers: {
          "X-Battle-Host-Tab": tabId,
          "X-Battle-Host-Session":
            localStorage.getItem(`battle_host_session_${roomId}`) || "",
        },
      });

      // Ensure phase is set to playing after successful start
      setGamePhase("playing");
      resetParticipantReadyStates();
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addNotification(`Start error: ${message}`);
    }
  };

  const setReadyStatus = async (ready: boolean) => {
    if (!roomId) {
      addNotification("Room is not ready yet.");
      return;
    }

    if (updateReadyMutation.isPending) {
      return;
    }

    const snapshot = useBattleStore.getState();
    const sessionId =
      snapshot.state?.currentUser?.session_id || state?.currentUser?.session_id;

    if (!sessionId) {
      addNotification("Your session is not available yet.");
      return;
    }

    try {
      await updateReadyMutation.mutateAsync({ roomId, ready });
      setParticipantReady(sessionId, ready);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addNotification(`Failed to update ready status: ${message}`);
    }
  };

  const toggleReadyStatus = async () => {
    const snapshot = useBattleStore.getState();
    const sessionId =
      snapshot.state?.currentUser?.session_id || state?.currentUser?.session_id;

    if (!sessionId) {
      addNotification("Your session is not available yet.");
      return;
    }

    const participants =
      snapshot.state?.participants ?? state?.participants ?? [];
    const me = participants.find((p) => p.session_id === sessionId);

    const nextReady = !(me?.is_ready ?? false);
    await setReadyStatus(nextReady);
  };

  const submitAnswer = async () => {
    const hasChoices = !!state?.activeRound?.question?.choices?.length;
    if (hasChoices) {
      if (!selectedChoiceId) {
        addNotification("Please select an option first!");
        return;
      }
    } else {
      if (!answer.trim()) {
        addNotification("Please enter an answer first!");
        return;
      }
    }

    if (hasSubmitted) {
      addNotification("You've already submitted for this round!");
      return;
    }

    // Prevent multiple simultaneous submissions
    if (submitInProgress.current) {
      console.log("[SUBMIT] Submission already in progress, skipping");
      return;
    }

    // Throttle submissions to prevent spam (increased from 1s to 3s)
    const now = Date.now();
    if (now - lastSubmitTime.current < 3000) {
      console.log("[SUBMIT] Submission throttled, too frequent");
      addNotification("Please wait before submitting again");
      return;
    }

    submitInProgress.current = true;
    lastSubmitTime.current = now;

    // Store original state for potential rollback
    const originalHasSubmitted = hasSubmitted;
    const originalAnswer = answer;
    const originalSelectedChoiceId = selectedChoiceId ?? null;

    // Optimistic update - immediately show as submitted
    setHasSubmitted(true);
    setAnswer(""); // Clear input
    setSelectedChoiceId(null); // Clear selection

    // Add loading indicator
    setIsProgressing(true);

    try {
      const currentRound = state?.activeRound?.roundNo || 1;
      const payload = hasChoices
        ? { choice_id: originalSelectedChoiceId || undefined }
        : { answer_text: originalAnswer };

      await submitAnswerMutation.mutateAsync({
        roomId: roomId!,
        roundNo: currentRound,
        payload,
      });

      // Success - refresh to get updated state
      await refresh();
    } catch (err) {
      // Rollback optimistic updates on failure
      console.error("[SUBMIT] Answer submission failed, rolling back:", err);
      setHasSubmitted(originalHasSubmitted);
      setAnswer(originalAnswer);
      setSelectedChoiceId(originalSelectedChoiceId);

      const message = err instanceof Error ? err.message : "Unknown error";
      addNotification(`Failed to submit answer: ${message}`);

      // Add retry option for network errors
      if (message.includes("network") || message.includes("timeout")) {
        setTimeout(() => {
          addNotification("Network error - you can try submitting again");
        }, 3000);
      }
    } finally {
      setIsProgressing(false);
      submitInProgress.current = false;
    }
  };

  const autoCloseRound = async () => {
    const snapshot = useBattleStore.getState();
    const latestState = snapshot.state || state;

    if (!snapshot.isHostCache || !latestState?.activeRound) {
      return;
    }

    if (latestState.activeRound.status !== "active") {
      return;
    }

    // Prevent multiple simultaneous close attempts
    if (snapshot.isProgressing || isProgressing) {
      return;
    }

    setIsProgressing(true);

    try {
      const currentRound = latestState.activeRound.roundNo;
      const totalRounds = latestState?.room?.num_questions || 0;

      // Close current round
      await closeRoundMutation.mutateAsync({
        roomId: roomId!,
        roundNo: currentRound,
      });

      await refresh();

      if (currentRound >= totalRounds) {
        setIsProgressing(false);
        return;
      }

      setIsProgressing(false);
    } catch {
      setIsProgressing(false);
    }
  };

  const advanceFromScoreboard = async () => {
    const snapshot = useBattleStore.getState();
    if (!snapshot.isHostCache || !roomId) {
      return;
    }

    if (snapshot.isProgressing) {
      return;
    }

    setIsProgressing(true);

    try {
      await advanceFromScoreboardMutation.mutateAsync({ roomId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addNotification(`Advance error: ${message}`);
    } finally {
      setIsProgressing(false);
    }
  };

  return {
    copyRoomLink,
    startBattle,
    submitAnswer,
    autoCloseRound,
    advanceFromScoreboard,
    setReadyStatus,
    toggleReadyStatus,
    formatTime: formatBattleTime,
    difficultyLabel: getDifficultyLabel,
    getDifficultyColor,
    getRoomStatusColor,

    // Loading states
    startBattleLoading: startBattleMutation.isPending,
    submitAnswerLoading: submitAnswerMutation.isPending,
    closeRoundLoading: closeRoundMutation.isPending,
    advanceFromScoreboardLoading: advanceFromScoreboardMutation.isPending,
    readyStatusLoading: updateReadyMutation.isPending,
  };
}
