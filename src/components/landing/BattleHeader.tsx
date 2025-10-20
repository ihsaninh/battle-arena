'use client';

import { motion } from 'framer-motion';
import { FaBolt, FaStar, FaTrophy } from 'react-icons/fa';

export function BattleHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-10 md:mb-12"
    >
      <div className="hidden md:inline-flex items-center gap-3 mb-4">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-4xl"
        >
          ⚔️
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          BATTLE ARENA
        </h1>
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          className="text-4xl"
        >
          🏆
        </motion.div>
      </div>

      <div className="md:hidden">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-7 shadow-lg shadow-purple-500/20 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-3 mb-4 text-3xl">
            <span>⚔️</span>
            <h1 className="text-[1.9rem] font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Battle Arena
            </h1>
            <span>🏆</span>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed">
            Challenge friends in fast-paced knowledge battles. Host a room or
            jump right in and climb the leaderboard.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-2">
              ⚡ Real-time Sync
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-2">
              🤖 AI Questions
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-2">
              🧠 Smart Scoring
            </span>
          </div>
        </div>
      </div>

      <p className="hidden md:block text-base text-gray-300 md:text-xl max-w-2xl mx-auto leading-relaxed md:leading-relaxed">
        Challenge friends in quick knowledge battles. Host a room or jump right
        in.
      </p>

      {/* Feature badges */}
      <div className="hidden md:flex flex-wrap justify-center gap-3 mt-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm">
          <FaBolt className="w-4 h-4" /> Real-time sync
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm">
          <FaStar className="w-4 h-4" /> AI questions
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm">
          <FaTrophy className="w-4 h-4" /> Fair scoring
        </span>
      </div>
    </motion.div>
  );
}
