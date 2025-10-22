'use client';

import { motion } from 'framer-motion';
import { FaBolt, FaCheck, FaStar } from 'react-icons/fa';

import { useBattleStore } from '@/src/lib/store/battle-store';
import {
  getDifficultyColor,
  getDifficultyLabel,
} from '@/src/lib/utils/formatters';
import type { AnsweringPhaseProps } from '@/src/types/battle';

export function AnsweringPhase({
  onSubmitAnswer,
  iHaveAnswered,
  loading,
}: AnsweringPhaseProps) {
  const {
    state,
    answer,
    setAnswer,
    selectedChoiceId,
    setSelectedChoiceId,
    timeLeft,
  } = useBattleStore();

  if (!state?.activeRound?.question) return null;

  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-cyan-900/20">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {state.activeRound?.roundNo === state?.room?.num_questions
              ? `Final Question (${state.activeRound?.roundNo}/${state?.room?.num_questions})`
              : `Round ${state.activeRound?.roundNo}${
                  state?.room?.num_questions
                    ? `/${state.room.num_questions}`
                    : ''
                }`}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs border ${getDifficultyColor(
                state.activeRound?.question?.difficulty || 0
              )}`}
            >
              {getDifficultyLabel(
                state.activeRound?.question?.difficulty || 0,
                state.activeRound?.question?.language || ''
              )}
            </span>
            {state.activeRound?.question?.category && (
              <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {state.activeRound.question.category}
              </span>
            )}
          </div>
        </div>
        <p className="text-white text-lg leading-relaxed">
          {state.activeRound?.question?.prompt}
        </p>
      </div>

      {/* Answer Input */}
      {!iHaveAnswered && (
        <div className="space-y-3 md:space-y-4">
          {state.activeRound?.question?.choices?.length ? (
            <div className="space-y-3 md:space-y-3">
              {state.activeRound.question.choices.map(c => {
                const isSelected = selectedChoiceId === c.id;

                const handleSelect = () => {
                  if (timeLeft === 0 || timeLeft === null) return;
                  setSelectedChoiceId(c.id);

                  // Haptic feedback for mobile
                  if ('vibrate' in navigator && window.innerWidth < 768) {
                    navigator.vibrate(50);
                  }
                };

                return (
                  <label
                    key={c.id}
                    className={`group relative flex items-center md:items-start gap-4 md:gap-3 p-5 md:p-4 rounded-xl border transition-all cursor-pointer touch-manipulation ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_0_2px_rgba(34,211,238,0.2)] scale-[1.02] md:scale-100'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98] md:active:scale-100'
                    } ${
                      timeLeft === 0 || timeLeft === null
                        ? 'opacity-60 cursor-not-allowed'
                        : ''
                    }`}
                    style={{ minHeight: '56px' }} // Ensure minimum touch target
                  >
                    {/* Hide the native radio visually but keep it accessible */}
                    <input
                      type="radio"
                      name="mcq"
                      className="sr-only"
                      checked={isSelected}
                      onChange={handleSelect}
                      disabled={timeLeft === 0 || timeLeft === null}
                    />
                    {/* Custom radio indicator - Larger for mobile */}
                    <div
                      className={`mt-1 md:mt-0.5 flex h-8 w-8 md:h-6 md:w-6 items-center justify-center rounded-full border transition-all ${
                        isSelected
                          ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg'
                          : 'border-white/30 text-transparent group-hover:border-cyan-400 group-active:border-cyan-300'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <FaCheck className="w-4 h-4 md:w-3.5 md:h-3.5" />
                      )}
                    </div>
                    {/* Option text */}
                    <div className="flex-1 text-white flex flex-col justify-center">
                      <div className="font-medium leading-relaxed">
                        <span className="text-base md:text-sm">{c.text}</span>
                      </div>
                    </div>
                    {(timeLeft === 0 || timeLeft === null) && (
                      <div
                        className="absolute inset-0 rounded-xl"
                        aria-hidden="true"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-400 resize-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              disabled={timeLeft === 0 || timeLeft === null}
            />
          )}

          {/* Submit Button - Enhanced for mobile */}
          <motion.button
            onClick={() => {
              // Haptic feedback on submit
              if ('vibrate' in navigator && window.innerWidth < 768) {
                navigator.vibrate([100, 50, 100]);
              }
              onSubmitAnswer();
            }}
            disabled={
              loading ||
              timeLeft === 0 ||
              timeLeft === null ||
              (state.activeRound?.question?.choices?.length
                ? !selectedChoiceId
                : !answer.trim())
            }
            whileTap={{ scale: 0.95 }}
            animate={{
              scale:
                (timeLeft || 0) <= 10 &&
                !loading &&
                (selectedChoiceId || answer.trim())
                  ? [1, 1.02, 1]
                  : 1,
            }}
            transition={{
              scale: {
                duration: 0.8,
                repeat: (timeLeft || 0) <= 10 ? Infinity : 0,
              },
            }}
            className="w-full px-6 py-4 md:py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 md:gap-2 text-lg md:text-base min-h-[56px] md:min-h-[48px] shadow-lg active:shadow-md"
          >
            {loading ? (
              <div className="w-6 h-6 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FaBolt className="w-6 h-6 md:w-5 md:h-5" />
            )}
            <span className="font-bold">
              {loading ? 'Submitting...' : 'Submit Answer'}
            </span>
          </motion.button>
        </div>
      )}

      {/* Submitted State */}
      {iHaveAnswered && (
        <div className="text-center p-6 rounded-2xl bg-green-900/20 border border-green-500/30">
          <FaStar className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Answer Submitted!
          </h3>
          <p className="text-green-300">
            Waiting for other players to finish...
          </p>
        </div>
      )}
    </div>
  );
}
