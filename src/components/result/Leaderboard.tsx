'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaCrown, FaTrophy } from 'react-icons/fa';

type FinalScoreEntry = {
  session_id: string;
  display_name: string;
  total_score: number;
  is_host?: boolean;
  team_id?: string;
};

interface TeamScore {
  id: string;
  team_name: string;
  team_color?: string;
  team_order: number;
  members: FinalScoreEntry[];
  totalScore: number;
}

interface LeaderboardProps {
  participants: FinalScoreEntry[];
  currentUserId?: string;
  isTeamBattle?: boolean;
  teamScores?: TeamScore[];
  teams?: Array<{
    id: string;
    team_name: string;
    team_color?: string;
    team_order: number;
  }>;
}

export function Leaderboard({
  participants,
  currentUserId,
  isTeamBattle,
  teamScores,
}: LeaderboardProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

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
        {isTeamBattle && teamScores && teamScores.length > 0
          ? // Team Battle View
            teamScores.map((team, index) => {
              const isExpanded = expandedTeams.has(team.id);
              const teamColor = team.team_order === 0 ? 'red' : 'blue';
              const teamEmoji = team.team_order === 0 ? '🔴' : '🔵';

              return (
                <div key={team.id}>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    className={`rounded-xl cursor-pointer ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-2 border-yellow-500/30'
                        : index === 1
                          ? 'bg-gradient-to-r from-gray-600/20 to-slate-600/20 border-2 border-gray-400/30'
                          : `bg-gradient-to-r from-${teamColor}-600/20 to-${teamColor}-700/20 border border-${teamColor}-500/30`
                    }`}
                    onClick={() => toggleTeam(team.id)}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            index === 0
                              ? 'bg-yellow-500 text-white shadow-lg'
                              : index === 1
                                ? 'bg-gray-400 text-white shadow-lg'
                                : 'bg-white/20 text-gray-300'
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Medal for top 2 */}
                        {index < 2 && (
                          <FaTrophy
                            className={`w-5 h-5 ${
                              index === 0 ? 'text-yellow-400' : 'text-gray-400'
                            }`}
                          />
                        )}

                        {/* Team Name & Info */}
                        <div>
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <span className="text-2xl">{teamEmoji}</span>
                            {team.team_name}
                          </h4>
                          <p className="text-sm text-white/60">
                            {team.members.length} player
                            {team.members.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Score */}
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {team.totalScore || 0}
                          </div>
                          <div className="text-sm text-gray-400">points</div>
                        </div>

                        {/* Expand/Collapse Icon */}
                        {isExpanded ? (
                          <FaChevronUp className="w-4 h-4 text-white/60" />
                        ) : (
                          <FaChevronDown className="w-4 h-4 text-white/60" />
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Expanded Team Members */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 ml-4 space-y-2"
                    >
                      {team.members
                        .sort(
                          (a, b) => (b.total_score || 0) - (a.total_score || 0)
                        )
                        .map((member, memberIndex) => (
                          <motion.div
                            key={member.session_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: memberIndex * 0.05 }}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              member.session_id === currentUserId
                                ? 'bg-cyan-600/20 border border-cyan-500/50'
                                : 'bg-white/5 border border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm text-white/70">
                                {memberIndex + 1}
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {member.display_name}
                                  {member.session_id === currentUserId && (
                                    <span className="ml-2 text-cyan-400 text-sm">
                                      (You)
                                    </span>
                                  )}
                                </p>
                                {member.is_host && (
                                  <span className="text-xs text-yellow-300 flex items-center gap-1">
                                    <FaCrown className="w-3 h-3" />
                                    Host
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-white">
                                {member.total_score || 0}
                              </div>
                              <div className="text-xs text-gray-400">
                                points
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </motion.div>
                  )}
                </div>
              );
            })
          : // Individual Battle View (Original)
            participants.map((participant, index) => (
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
                        <span className="ml-2 text-cyan-400 text-sm">
                          (You)
                        </span>
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
