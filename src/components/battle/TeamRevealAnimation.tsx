'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import type { BattleParticipant, BattleTeam } from '@/src/types/battle';

interface TeamRevealAnimationProps {
  show: boolean;
  participants: BattleParticipant[];
  teams: BattleTeam[];
  onComplete: () => void;
  currentSessionId?: string;
}

type AnimationPhase = 'shuffle' | 'reveal';

export function TeamRevealAnimation({
  show,
  participants,
  teams,
  onComplete,
  currentSessionId,
}: TeamRevealAnimationProps) {
  const [phase, setPhase] = useState<AnimationPhase>('shuffle');

  useEffect(() => {
    if (!show) return;

    // Phase 1: Shuffle (0-0.8s)
    const shuffleTimer = setTimeout(() => {
      setPhase('reveal');
    }, 800);

    // Phase 2: Reveal (0.8-3.5s) - Extended for user to see their team
    const revealTimer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(shuffleTimer);
      clearTimeout(revealTimer);
    };
  }, [show, onComplete]);

  if (!show) return null;

  // Group participants by team
  const redTeam = teams.find(t => t.team_order === 0);
  const blueTeam = teams.find(t => t.team_order === 1);

  const redPlayers = participants.filter(p => p.team_id === redTeam?.id);
  const bluePlayers = participants.filter(p => p.team_id === blueTeam?.id);

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="team-reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
        >
          {/* Phase 1: Shuffle */}
          {phase === 'shuffle' && (
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="text-8xl"
              >
                🎲
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold text-white"
              >
                Shuffling teams...
              </motion.h2>
            </motion.div>
          )}

          {/* Phase 2: Reveal */}
          {phase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8 w-full max-w-6xl px-4"
            >
              <motion.h2
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-4xl md:text-5xl font-bold text-white mb-4"
              >
                Teams Revealed!
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 w-full">
                {/* Red Team */}
                <motion.div
                  initial={{ x: -300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="relative"
                >
                  <div className="rounded-2xl border-4 border-red-500 bg-gradient-to-br from-red-900/40 to-red-950/20 p-6 md:p-8 backdrop-blur-xl">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <span className="text-4xl md:text-5xl">🔴</span>
                      <h3 className="text-3xl md:text-4xl font-bold text-red-400">
                        {redTeam?.team_name || 'Red Team'}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {redPlayers.map((player, index) => {
                        const isCurrentUser =
                          player.session_id === currentSessionId;
                        return (
                          <motion.div
                            key={player.session_id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 + index * 0.15 }}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                              isCurrentUser
                                ? 'bg-red-400/30 border-2 border-red-300 ring-2 ring-red-400/50 shadow-lg shadow-red-500/50'
                                : 'bg-red-500/10 border border-red-500/30'
                            }`}
                          >
                            <span className="text-2xl">👤</span>
                            <span
                              className={`text-xl font-semibold ${
                                isCurrentUser ? 'text-white' : 'text-white'
                              }`}
                            >
                              {player.display_name}
                              {isCurrentUser && (
                                <span className="ml-2 text-red-200 text-base">
                                  (You)
                                </span>
                              )}
                            </span>
                            {player.is_host && (
                              <span className="ml-auto text-yellow-400 text-sm">
                                👑 Host
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>

                {/* Blue Team */}
                <motion.div
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="relative"
                >
                  <div className="rounded-2xl border-4 border-blue-500 bg-gradient-to-br from-blue-900/40 to-blue-950/20 p-6 md:p-8 backdrop-blur-xl">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <span className="text-4xl md:text-5xl">🔵</span>
                      <h3 className="text-3xl md:text-4xl font-bold text-blue-400">
                        {blueTeam?.team_name || 'Blue Team'}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {bluePlayers.map((player, index) => {
                        const isCurrentUser =
                          player.session_id === currentSessionId;
                        return (
                          <motion.div
                            key={player.session_id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 + index * 0.15 }}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                              isCurrentUser
                                ? 'bg-blue-400/30 border-2 border-blue-300 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/50'
                                : 'bg-blue-500/10 border border-blue-500/30'
                            }`}
                          >
                            <span className="text-2xl">👤</span>
                            <span
                              className={`text-xl font-semibold ${
                                isCurrentUser ? 'text-white' : 'text-white'
                              }`}
                            >
                              {player.display_name}
                              {isCurrentUser && (
                                <span className="ml-2 text-blue-200 text-base">
                                  (You)
                                </span>
                              )}
                            </span>
                            {player.is_host && (
                              <span className="ml-auto text-yellow-400 text-sm">
                                👑 Host
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* VS Indicator */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl md:text-8xl font-black text-white opacity-20"
                style={{ textShadow: '0 0 30px rgba(255,255,255,0.5)' }}
              >
                VS
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
