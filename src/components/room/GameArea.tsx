'use client';

import { motion } from 'framer-motion';
import { FaClock, FaUsers } from 'react-icons/fa';

import { useBattleStore } from '@/src/lib/store/battle-store';
import { formatBattleTime } from '@/src/lib/utils/formatters';
import type { GameAreaProps } from '@/src/types/battle';

import { AnsweringPhase } from './AnsweringPhase';
import { FinishedPhase } from './FinishedPhase';
import { PlayingPhase } from './PlayingPhase';
import { ScoreboardPhase } from './ScoreboardPhase';
import { WaitingPhase } from './WaitingPhase';

export function GameArea({
  timeLeft,
  answeredCount,
  onStartBattle,
  onSubmitAnswer,
  isHost,
  iHaveAnswered,
  loading,
  totalParticipants,
  scoreboard,
  onAdvanceFromScoreboard,
  advanceFromScoreboardLoading,
  onToggleReady,
  readyLoading,
}: GameAreaProps) {
  const { state, gamePhase } = useBattleStore();
  const currentSessionId = state?.currentUser?.session_id || null;
  const participants = state?.participants ?? [];
  const myParticipant = participants.find(
    p => p.session_id === currentSessionId
  );
  const isReady = !!myParticipant?.is_ready;
  const roomCapacity = state?.room?.capacity ?? 2;
  const totalRounds = state?.room?.num_questions || 0;
  const showScoreboard =
    Boolean(scoreboard) &&
    (gamePhase === 'scoreboard' ||
      gamePhase === 'playing' ||
      gamePhase === 'answering');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl min-h-[520px] md:min-h-[600px]"
    >
      {/* Game Header */}
      <div className="border-b border-white/10 px-5 py-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-white md:text-2xl">
            {gamePhase === 'waiting' && '⏳ Waiting for Battle to Start'}
            {gamePhase === 'playing' && '🎮 Battle in Progress'}
            {gamePhase === 'answering' && '📝 Answer the Question'}
            {gamePhase === 'scoreboard' && '🏆 Scoreboard'}
            {gamePhase === 'finished' && '🏆 Battle Finished'}
          </h2>
          {timeLeft !== null && gamePhase === 'answering' && (
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {/* Simple Timer */}
              <motion.div
                animate={{
                  scale: timeLeft <= 10 ? [1, 1.05, 1] : 1,
                  backgroundColor:
                    timeLeft <= 10
                      ? [
                          'rgba(239, 68, 68, 0.2)',
                          'rgba(239, 68, 68, 0.3)',
                          'rgba(239, 68, 68, 0.2)',
                        ]
                      : 'rgba(255, 255, 255, 0.1)',
                }}
                transition={{
                  scale: {
                    duration: 0.5,
                    repeat: timeLeft <= 10 ? Infinity : 0,
                  },
                  backgroundColor: {
                    duration: 1,
                    repeat: timeLeft <= 10 ? Infinity : 0,
                  },
                }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold md:text-lg md:px-4 md:py-2 transition-all duration-700 ease-in-out ${
                  timeLeft <= 10
                    ? 'bg-gradient-to-r from-red-500/25 to-orange-500/25 text-red-300 border-red-400/40 shadow-lg'
                    : timeLeft <= 30
                      ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-400/40'
                      : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-400/40'
                }`}
              >
                <motion.div
                  animate={{
                    rotate: timeLeft <= 10 ? [0, 5, -5, 0] : 0,
                    scale: timeLeft <= 5 ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    rotate: {
                      duration: 0.3,
                      repeat: timeLeft <= 10 ? Infinity : 0,
                    },
                    scale: {
                      duration: 0.2,
                      repeat: timeLeft <= 5 ? Infinity : 0,
                    },
                  }}
                >
                  <FaClock className="h-4 w-4" />
                </motion.div>
                <span className="tabular-nums tracking-wide">
                  {formatBattleTime(timeLeft)}
                </span>
                {timeLeft <= 10 && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-2 h-2 bg-red-400 rounded-full"
                  />
                )}
              </motion.div>

              {/* Answered Count Indicator */}
              <motion.div
                animate={{
                  scale: answeredCount > 0 ? [1, 1.02, 1] : 1,
                }}
                transition={{
                  duration: 0.3,
                  delay: 0.1,
                }}
                className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 px-3 py-1.5 text-sm font-semibold text-blue-200 md:text-lg md:px-4 md:py-2 transition-all duration-300"
              >
                <motion.div
                  animate={{
                    rotate: answeredCount > 0 ? [0, 360] : 0,
                  }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeOut',
                  }}
                >
                  <FaUsers className="h-4 w-4" />
                </motion.div>
                <span className="tabular-nums">
                  {answeredCount}/{totalParticipants || 0} answered
                </span>
                {answeredCount === totalParticipants &&
                  totalParticipants > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-green-400 rounded-full"
                    />
                  )}
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 px-5 py-5 md:p-6">
        {gamePhase === 'waiting' && (
          <WaitingPhase
            onStartBattle={onStartBattle}
            onToggleReady={onToggleReady}
            isHost={isHost}
            loading={loading}
            readyLoading={readyLoading}
            participants={participants}
            currentSessionId={currentSessionId}
            isReady={isReady}
            roomCapacity={roomCapacity}
          />
        )}
        {showScoreboard && scoreboard && (
          <ScoreboardPhase
            scoreboard={scoreboard}
            isHost={isHost}
            loading={advanceFromScoreboardLoading}
            onAdvance={onAdvanceFromScoreboard}
            currentSessionId={currentSessionId}
            totalRounds={totalRounds}
          />
        )}
        {!showScoreboard &&
          gamePhase === 'answering' &&
          state?.activeRound?.status === 'active' &&
          (state?.activeRound?.question ? (
            <AnsweringPhase
              onSubmitAnswer={onSubmitAnswer}
              iHaveAnswered={iHaveAnswered}
              loading={loading}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-6 space-y-4"
            >
              {/* Enhanced question loading spinner */}
              <div className="relative mx-auto w-16 h-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="absolute inset-0 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-2 border-2 border-blue-500/20 border-b-blue-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-4 h-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                </motion.div>
              </div>

              {/* Loading text */}
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <p className="text-white/90 font-medium">Preparing question</p>
                <div className="flex justify-center space-x-1 mt-1">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                      className="text-cyan-400 text-lg"
                    >
                      .
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {/* Progress dots */}
              <div className="flex justify-center space-x-2">
                {[0, 1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: 'easeInOut',
                    }}
                    className="w-2 h-2 bg-cyan-400 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          ))}
        {gamePhase === 'finished' && <FinishedPhase />}
        {!showScoreboard && gamePhase === 'playing' && !state?.activeRound && (
          <PlayingPhase />
        )}
      </div>
    </motion.div>
  );
}
