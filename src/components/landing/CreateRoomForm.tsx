'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  FaBolt,
  FaClock,
  FaCog,
  FaCrown,
  FaSlidersH,
  FaTachometerAlt,
  FaUsers,
} from 'react-icons/fa';

interface CreateRoomFormProps {
  createPayload: {
    topic: string;
    hostDisplayName: string;
    language: 'en' | 'id';
    numQuestions: number;
    roundTimeSec: number;
    capacity: number;
    questionType: 'open-ended' | 'multiple-choice';
    difficulty: 'easy' | 'medium' | 'hard' | undefined;
    battleMode: 'individual' | 'team';
  };
  loading: boolean;
  onCreateRoom: (e: React.FormEvent) => void;
  onSetCreatePayload: (
    payload: React.SetStateAction<{
      topic: string;
      hostDisplayName: string;
      language: 'en' | 'id';
      numQuestions: number;
      roundTimeSec: number;
      capacity: number;
      questionType: 'open-ended' | 'multiple-choice';
      difficulty: 'easy' | 'medium' | 'hard' | undefined;
      battleMode: 'individual' | 'team';
    }>
  ) => void;
  onSetGameMode: (mode: 'create' | 'join' | null) => void;
}

export function CreateRoomForm({
  createPayload,
  loading,
  onCreateRoom,
  onSetCreatePayload,
  onSetGameMode,
}: CreateRoomFormProps) {
  const [showAdvancedMobile, setShowAdvancedMobile] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <div className="mb-5 md:mb-6 flex items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => onSetGameMode(null)}
          className="p-2.5 md:p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-2xl md:text-3xl">🛡️</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Create Battle Room
          </h2>
        </div>
      </div>

      <form onSubmit={onCreateRoom} className="space-y-5 md:space-y-6">
        {/* Basic Info */}
        <div className="rounded-2xl border border-purple-500/30 bg-purple-900/20 p-5 md:p-6 backdrop-blur-xl">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FaCrown className="w-6 h-6 text-purple-400" />
            Host Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-purple-200 mb-2">
                Your Name *
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                placeholder="Enter your battle name"
                value={createPayload.hostDisplayName}
                onChange={e =>
                  onSetCreatePayload({
                    ...createPayload,
                    hostDisplayName: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-purple-200 mb-2">
                Battle Topic
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                placeholder="e.g., Technology, History (optional)"
                value={createPayload.topic}
                onChange={e =>
                  onSetCreatePayload({
                    ...createPayload,
                    topic: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Battle Mode Selection */}
        <div className="rounded-2xl border border-green-500/30 bg-green-900/20 p-5 md:p-6 backdrop-blur-xl">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FaUsers className="w-6 h-6 text-green-400" />
            Battle Mode
          </h3>
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  onSetCreatePayload({
                    ...createPayload,
                    battleMode: 'individual',
                    capacity:
                      createPayload.battleMode === 'team'
                        ? 4
                        : createPayload.capacity,
                  })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  createPayload.battleMode === 'individual'
                    ? 'border-green-400 bg-green-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-2">🏃</div>
                <div className="font-semibold">Individual</div>
                <div className="text-xs mt-1 opacity-70">
                  Every player for themselves
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  onSetCreatePayload({
                    ...createPayload,
                    battleMode: 'team',
                    capacity:
                      createPayload.capacity % 2 === 0
                        ? createPayload.capacity
                        : 4,
                  })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  createPayload.battleMode === 'team'
                    ? 'border-green-400 bg-green-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="font-semibold">Team Battle</div>
                <div className="text-xs mt-1 opacity-70">
                  Red vs Blue (2 teams)
                </div>
              </button>
            </div>

            {/* Team Mode Info */}
            {createPayload.battleMode === 'team' && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-2 text-yellow-200">
                  <span className="text-lg">ℹ️</span>
                  <div className="text-sm">
                    <div className="font-semibold mb-1">Team Battle Mode:</div>
                    <ul className="space-y-1 opacity-90">
                      <li>
                        • 2 teams:{' '}
                        <span className="text-red-400">Red Team</span> vs{' '}
                        <span className="text-blue-400">Blue Team</span>
                      </li>
                      <li>• Players randomly assigned when battle starts</li>
                      <li>• Room must be full to start</li>
                      <li>• Team with highest total score wins</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden flex justify-center">
          <button
            type="button"
            onClick={() => setShowAdvancedMobile(value => !value)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white"
          >
            <FaSlidersH className="h-4 w-4" />
            {showAdvancedMobile
              ? 'Hide advanced settings'
              : 'Show advanced settings'}
          </button>
        </div>

        {/* Game Settings */}
        <div
          className={`rounded-2xl border border-blue-500/30 bg-blue-900/20 backdrop-blur-xl ${
            showAdvancedMobile ? 'block' : 'hidden'
          } md:block`}
        >
          <div className="p-5 md:p-6">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaCog className="w-6 h-6 text-blue-400" />
              Battle Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-blue-200 mb-2">
                  Question Type
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  value={createPayload.questionType}
                  onChange={e =>
                    onSetCreatePayload({
                      ...createPayload,
                      questionType: e.target.value as
                        | 'open-ended'
                        | 'multiple-choice',
                    })
                  }
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="open-ended">Open-ended</option>
                </select>
                {createPayload.questionType === 'multiple-choice' ? (
                  <div className="text-xs text-blue-300 mt-1">
                    MCQ shows 4 options, 1 correct
                  </div>
                ) : (
                  <div className="text-xs text-blue-300 mt-1">
                    Open-ended lets players type free-form answers
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-blue-200 mb-2">
                  Language
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  value={createPayload.language}
                  onChange={e =>
                    onSetCreatePayload({
                      ...createPayload,
                      language: e.target.value as 'en' | 'id',
                    })
                  }
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="id">🇮🇩 Bahasa Indonesia</option>
                </select>
              </div>

              <div>
                <label className="text-xs md:text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
                  <FaTachometerAlt className="w-4 h-4" />
                  Difficulty (optional)
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  value={createPayload.difficulty ?? ''}
                  onChange={e =>
                    onSetCreatePayload({
                      ...createPayload,
                      difficulty: e.target.value
                        ? (e.target.value as 'easy' | 'medium' | 'hard')
                        : undefined,
                    })
                  }
                >
                  <option value="">Random each round</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <div className="text-xs text-blue-300 mt-1">
                  {createPayload.difficulty
                    ? `All rounds will use ${
                        createPayload.difficulty === 'easy'
                          ? 'easy'
                          : createPayload.difficulty === 'hard'
                            ? 'hard'
                            : 'medium'
                      } questions`
                    : 'Keep difficulty randomized each round'}
                </div>
              </div>

              <div>
                <label className="text-xs md:text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
                  <FaUsers className="w-4 h-4" />
                  Max Players
                </label>
                {createPayload.battleMode === 'team' ? (
                  <>
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                      value={createPayload.capacity}
                      onChange={e =>
                        onSetCreatePayload({
                          ...createPayload,
                          capacity: Number(e.target.value),
                        })
                      }
                    >
                      <option value={4}>4 Players (2v2)</option>
                      <option value={6}>6 Players (3v3)</option>
                      <option value={8}>8 Players (4v4)</option>
                      <option value={10}>10 Players (5v5)</option>
                      <option value={12}>12 Players (6v6)</option>
                    </select>
                    <div className="text-xs text-blue-300 mt-1">
                      Even number required for team battles
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      value={createPayload.capacity}
                      onChange={e =>
                        onSetCreatePayload({
                          ...createPayload,
                          capacity: Number(e.target.value),
                        })
                      }
                      className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-blue-300 mt-1">
                      <span>2</span>
                      <span>{createPayload.capacity} players</span>
                      <span>12</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-xs md:text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
                  <FaBolt className="w-4 h-4" />
                  Questions: {createPayload.numQuestions}
                </label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={createPayload.numQuestions}
                  onChange={e =>
                    onSetCreatePayload({
                      ...createPayload,
                      numQuestions: Number(e.target.value),
                    })
                  }
                  className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-blue-300 mt-1">3-10 rounds</div>
              </div>

              <div>
                <label className="text-xs md:text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
                  <FaClock className="w-4 h-4" />
                  Round Time: {createPayload.roundTimeSec}s
                </label>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={15}
                  value={createPayload.roundTimeSec}
                  onChange={e =>
                    onSetCreatePayload({
                      ...createPayload,
                      roundTimeSec: Number(e.target.value),
                    })
                  }
                  className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-blue-300 mt-1">
                  15s - 3min per question
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FaCrown className="w-5 h-5" />
            )}
            {loading ? 'Creating...' : 'Create Battle Room'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
