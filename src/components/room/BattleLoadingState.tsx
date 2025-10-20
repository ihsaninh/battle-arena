'use client';

import { motion } from 'framer-motion';

export const BattleLoadingState = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-purple-400 rounded-full opacity-30"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 2) * 40}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center relative z-10"
      >
        {/* Enhanced spinner */}
        <div className="relative mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 mx-auto"
          >
            <div className="w-full h-full border-4 border-purple-500/20 border-t-purple-500 rounded-full" />
          </motion.div>

          {/* Inner spinning element */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 border-2 border-pink-500/20 border-b-pink-500 rounded-full"
          />

          {/* Center logo */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
          </motion.div>
        </div>

        {/* Loading text with animation */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-white/90 text-lg font-medium mb-2">
            Loading battle room
          </p>
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="text-purple-400 text-xl"
              >
                .
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Progress indicator */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, repeat: Infinity }}
          className="h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mt-4 max-w-xs"
        />
      </motion.div>
    </div>
  );
};
