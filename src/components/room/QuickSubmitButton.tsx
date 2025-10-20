"use client";

import { motion } from "framer-motion";
import { FaBolt } from "react-icons/fa";

import { StateResp } from "@/src/types";

interface QuickSubmitButtonProps {
  timeLeft: number | null;
  iHaveAnswered: boolean;
  loading: boolean;
  state: StateResp;
  selectedChoiceId?: string;
  answer?: string;
  submitAnswer: () => void;
}

export const QuickSubmitButton = ({
  timeLeft,
  iHaveAnswered,
  loading,
  state,
  selectedChoiceId,
  answer = "",
  submitAnswer,
}: QuickSubmitButtonProps) => {
  if (
    state?.room?.status !== "active" ||
    !state.activeRound ||
    iHaveAnswered ||
    timeLeft === null ||
    timeLeft <= 0
  ) {
    return null;
  }

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.9 }}
      onClick={submitAnswer}
      disabled={
        loading ||
        (state.activeRound?.question?.choices?.length
          ? !selectedChoiceId
          : !answer.trim())
      }
      className="fixed bottom-32 right-4 z-30 lg:hidden w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-xl border border-green-500/30 backdrop-blur-sm transition-all"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 8rem)",
      }}
      aria-label="Quick submit answer"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <motion.div
          animate={{
            scale: timeLeft && timeLeft <= 10 ? [1, 1.2, 1] : 1,
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            scale: {
              duration: 0.5,
              repeat: timeLeft && timeLeft <= 10 ? Infinity : 0,
            },
            rotate: { duration: 2, repeat: Infinity },
          }}
        >
          <FaBolt className="w-6 h-6" />
        </motion.div>
      )}
    </motion.button>
  );
};
