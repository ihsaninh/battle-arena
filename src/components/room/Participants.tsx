"use client";

import { motion } from "framer-motion";
import { FaCheck, FaCrown, FaGamepad, FaUsers } from "react-icons/fa";

import { useBattleStore } from "@/src/lib/battle-store";

interface ParticipantsProps {
  roomId: string;
  variant?: "default" | "compact";
}

export function Participants({ variant = "default" }: ParticipantsProps) {
  const { state, answerStatus, gamePhase } = useBattleStore();
  const isCompact = variant === "compact";

  if (!state?.participants) return null;

  const onlineCount = state.participants.filter(
    (p) => p.connection_status !== "offline"
  ).length;
  const capacity = state.room?.capacity || state.participants.length;
  const isWaiting = state.room?.status === "waiting";

  return (
    <motion.div
      initial={{ opacity: 0, x: isCompact ? 0 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl backdrop-blur-xl ${
        isCompact
          ? "border border-blue-500/20 bg-blue-900/40 p-4"
          : "border border-blue-500/30 bg-blue-900/20 p-6"
      }`}
    >
      <h2
        className={`font-semibold text-white mb-4 flex items-center gap-2 ${
          isCompact ? "text-lg" : "text-xl"
        }`}
      >
        <FaUsers className="w-5 h-5 text-blue-400" />
        Players ({onlineCount}/{capacity})
      </h2>
      <div className="space-y-3">
        {state.participants?.map((participant, index) => {
          const itemPadding = isCompact ? "px-3 py-2.5" : "px-4 py-3";
          const isOffline = participant.connection_status === "offline";
          const isReady = participant.is_ready;
          // Find answer status for this participant
          const participantAnswerStatus = answerStatus?.participants.find(
            (p) => p.session_id === participant.session_id
          );

          return (
            <motion.div
              key={participant.session_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`flex items-center justify-between rounded-xl border ${itemPadding} ${
                participant.is_host
                  ? "border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-pink-600/20"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                {participant.is_host ? (
                  <FaCrown className="w-4 h-4 text-yellow-400" />
                ) : (
                  <FaGamepad
                    className={`w-4 h-4 ${
                      isOffline ? "text-red-400" : "text-gray-400"
                    }`}
                  />
                )}
                <span className="text-white font-medium">
                  {participant.display_name || "Anonymous Player"}
                </span>
                {participant.is_host && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                    HOST
                  </span>
                )}
                {isOffline && (
                  <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                    OFFLINE
                  </span>
                )}
              </div>

              {/* Answer Status Indicator */}
              <div className="flex items-center gap-2">
                {isOffline ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="text-xs">Disconnected</span>
                  </div>
                ) : (
                  <>
                    {isWaiting && (
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full border ${
                          participant.is_host
                            ? "bg-purple-500/20 text-purple-200 border-purple-400/40"
                            : isReady
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-yellow-500/20 text-yellow-300 border-yellow-400/30"
                        }`}
                      >
                        {participant.is_host ? (
                          <>
                            <FaCrown className="w-3 h-3" />
                            <span className="text-xs">Host</span>
                          </>
                        ) : isReady ? (
                          <>
                            <FaCheck className="w-3 h-3" />
                            <span className="text-xs">Ready</span>
                          </>
                        ) : (
                          <>
                            <div className="w-3 h-3 rounded-full border border-yellow-300" />
                            <span className="text-xs">Waiting</span>
                          </>
                        )}
                      </div>
                    )}
                    {gamePhase === "answering" &&
                      answerStatus &&
                      participantAnswerStatus && (
                        <div className="flex items-center gap-1">
                          {participantAnswerStatus.has_answered ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                              <FaCheck className="w-3 h-3" />
                              <span className="text-xs">Answered</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                              <div className="w-3 h-3 rounded-full border border-gray-400" />
                              <span className="text-xs">Waiting</span>
                            </div>
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
