import { useEffect, useRef } from "react";
import { useInterval } from "usehooks-ts";

import { useBattleStore } from "@/src/lib/battle-store";
import type { StateResp } from "@/src/types/battle";

export function useTimer(
  state: StateResp | undefined,
  autoCloseRound: () => Promise<void>
) {
  const { gamePhase, timeLeft, setTimeLeft, isProgressing } = useBattleStore();

  // Refs to track previous values and prevent infinite loops
  const prevTimeLeftRef = useRef<number | null>(null);
  const prevDeadlineRef = useRef<string | undefined>(undefined);

  const updateTimer = () => {
    if (!state?.activeRound?.deadlineAt) {
      if (prevTimeLeftRef.current !== null) {
        prevTimeLeftRef.current = null;
        setTimeLeft(null);
      }
      return;
    }

    const deadline = new Date(state.activeRound.deadlineAt).getTime();
    // Use server time for accurate calculation
    const currentServerTime =
      state.serverTime && state.clientTimeReceived
        ? state.serverTime + (Date.now() - state.clientTimeReceived)
        : Date.now();
    const remaining = Math.max(
      0,
      Math.floor((deadline - currentServerTime) / 1000)
    );

    if (prevTimeLeftRef.current !== remaining) {
      prevTimeLeftRef.current = remaining;
      setTimeLeft(remaining);
    }

    // Auto-progress when timer reaches zero (only for host)
    if (
      remaining === 0 &&
      gamePhase === "answering" &&
      state.activeRound?.status === "active" &&
      !isProgressing
    ) {
      console.log("[TIMER] Auto-closing round due to timer expiration");
      autoCloseRound();
    }
  };

  // Use useInterval from usehooks-ts for the timer
  // Only run when there's an active round with a deadline
  const shouldRunTimer = state?.activeRound?.deadlineAt !== undefined;
  useInterval(updateTimer, shouldRunTimer ? 1000 : null);

  // Initial timer update when activeRound changes
  useEffect(() => {
    const currentDeadline = state?.activeRound?.deadlineAt;
    if (prevDeadlineRef.current !== currentDeadline) {
      prevDeadlineRef.current = currentDeadline;
      updateTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.activeRound?.deadlineAt]);

  // Cleanup refs when component unmounts
  useEffect(() => {
    return () => {
      prevTimeLeftRef.current = null;
      prevDeadlineRef.current = undefined;
    };
  }, []);

  return {
    timeLeft,
  };
}
