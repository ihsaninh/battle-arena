'use client';

import { motion } from 'framer-motion';
import { FaCrown, FaTrophy } from 'react-icons/fa';

type FinalScoreEntry = {
  session_id: string;
  display_name: string;
  total_score: number;
  is_host?: boolean;
};

interface LeaderboardProps {
  participants: FinalScoreEntry[];
  currentUserId?: string;
}

export function Leaderboard({ participants, currentUserId }: LeaderboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8"
    >
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <FaTrophy className="w-6 h-6 text-yellow-400" />
        Final Leaderboard
      </h3>

      <div className="space-y-4">
        {participants.map((participant, index) => (
          <motion.div
            key={participant.session_id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + index * 0.1 }}
            className={`flex items-center justify-between p-4 rounded-xl ${
              participant.session_id === currentUserId
                ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/50 ring-2 ring-cyan-400/30'
                : index === 0
                  ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30'
                  : index === 1
                    ? 'bg-gradient-to-r from-gray-600/20 to-slate-600/20 border border-gray-400/30'
                    : index === 2
                      ? 'bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border border-amber-500/30'
                      : 'bg-white/5 border border-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Rank */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  index === 0
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : index === 1
                      ? 'bg-gray-400 text-white shadow-lg'
                      : index === 2
                        ? 'bg-amber-600 text-white shadow-lg'
                        : 'bg-white/20 text-gray-300'
                }`}
              >
                {index + 1}
              </div>

              {/* Medal for top 3 */}
              {index < 3 && (
                <FaTrophy
                  className={`w-5 h-5 ${
                    index === 0
                      ? 'text-yellow-400'
                      : index === 1
                        ? 'text-gray-400'
                        : 'text-amber-600'
                  }`}
                />
              )}

              {/* Name & Host badge */}
              <div>
                <h4 className="text-white font-semibold">
                  {participant.display_name}
                  {participant.session_id === currentUserId && (
                    <span className="ml-2 text-cyan-400 text-sm">(You)</span>
                  )}
                </h4>
                {participant.is_host && (
                  <span className="text-xs text-yellow-300 flex items-center gap-1 mt-1">
                    <FaCrown className="w-3 h-3" />
                    Host
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="text-right">
              <div className="text-xl font-bold text-white">
                {participant.total_score || 0}
              </div>
              <div className="text-sm text-gray-400">points</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
