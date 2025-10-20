'use client';

import { motion } from 'framer-motion';
import { FaCrown } from 'react-icons/fa';

interface WinnerSpotlightProps {
  winnerName?: string;
  winnerScore?: number;
}

export function WinnerSpotlight({
  winnerName,
  winnerScore,
}: WinnerSpotlightProps) {
  if (!winnerName) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="mb-8 text-center"
    >
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-2xl p-6">
        <FaCrown className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
        <h3 className="text-2xl font-bold text-white mb-2">
          🎉 Champion: {winnerName}
        </h3>
        <p className="text-yellow-300 text-lg font-semibold">
          {winnerScore} points
        </p>
      </div>
    </motion.div>
  );
}
