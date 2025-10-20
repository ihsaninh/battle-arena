'use client';

import { motion } from 'framer-motion';
import { FaClock, FaGamepad, FaStar } from 'react-icons/fa';

import { useBattleStore } from '@/src/lib/battle-store';

export function PlayingPhase() {
  const { isProgressing, state } = useBattleStore();

  const isCalculatingFinal =
    state?.room?.num_questions &&
    state?.room?.status === 'active' &&
    !state.activeRound;

  return (
    <div className="text-center space-y-6">
      {isProgressing ? (
        <>
          {/* Enhanced Loading Animation */}
          <div className="relative">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{
                duration: isCalculatingFinal ? 3 : 2,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="relative mx-auto"
            >
              {isCalculatingFinal ? (
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                  <FaStar className="w-10 h-10 text-white" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <FaClock className="w-10 h-10 text-white" />
                </div>
              )}
            </motion.div>

            {/* Pulse effect */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`absolute inset-0 rounded-full ${
                isCalculatingFinal
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
            />
          </div>

          {/* Progress dots */}
          <div className="flex justify-center space-x-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
                className={`w-3 h-3 rounded-full ${
                  isCalculatingFinal ? 'bg-yellow-400' : 'bg-purple-400'
                }`}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-semibold text-white mb-2">
              {isCalculatingFinal
                ? '🏆 Calculating Final Results...'
                : '⚡ Preparing Next Round...'}
            </h3>
            <p className="text-gray-300 max-w-md mx-auto">
              {isCalculatingFinal
                ? 'The battle is finishing up. Final scores are being calculated and the winner will be announced soon!'
                : 'The next question is being prepared automatically. Get ready for another exciting round!'}
            </p>
          </motion.div>

          {/* Additional loading indicator */}
          <motion.div
            animate={{ width: ['0%', '100%', '0%'] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`h-1 rounded-full mx-auto max-w-xs ${
              isCalculatingFinal
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
          />
        </>
      ) : (
        <>
          {/* Get Ready State */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              rotate: {
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
              },
            }}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center mx-auto"
          >
            <FaGamepad className="w-10 h-10 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-semibold text-white mb-2">
              🎮 Get Ready!
            </h3>
            <p className="text-gray-300">The next round is about to begin...</p>
          </motion.div>

          {/* Animated countdown-like effect */}
          <div className="flex justify-center space-x-4">
            {[3, 2, 1].map((num, i) => (
              <motion.div
                key={num}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
                className="w-8 h-8 rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center"
              >
                <span className="text-cyan-300 text-sm font-bold">{num}</span>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
