'use client';

import { motion } from 'framer-motion';
import { FaTrophy } from 'react-icons/fa';

interface ResultHeaderProps {
  topic?: string;
  numQuestions?: number;
  userScore?: number;
  userRank?: number;
}

export function ResultHeader({
  topic,
  numQuestions,
  userScore,
  userRank,
}: ResultHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6"
      >
        <FaTrophy className="w-12 h-12 text-white" />
      </motion.div>

      <h1 className="text-4xl font-bold text-white mb-2">
        🏆 Battle Complete!
      </h1>
      <p className="text-gray-300 text-lg">
        {topic || 'Quiz'} • {numQuestions} Questions
      </p>

      {/* User's Performance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 inline-block bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/50 rounded-2xl p-6"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Your Result</h2>
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400">
              {userScore || 0}
            </div>
            <div className="text-sm text-gray-300">Total Points</div>
          </div>
          <div className="w-px h-12 bg-gray-600" />
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400">
              #{userRank}
            </div>
            <div className="text-sm text-gray-300">Rank</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
