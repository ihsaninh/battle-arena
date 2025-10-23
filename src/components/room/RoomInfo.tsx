'use client';

import { motion } from 'framer-motion';
import { FaGamepad } from 'react-icons/fa';

import { useBattleStore } from '@/src/lib/store/battle-store';
import { formatBattleTime } from '@/src/lib/utils/formatters';
import { TeamScoreDisplay } from '@/src/components/battle';

interface RoomInfoProps {
  roomId: string;
  variant?: 'default' | 'compact';
}

export function RoomInfo({ variant = 'default' }: RoomInfoProps) {
  const { state } = useBattleStore();
  const isCompact = variant === 'compact';

  if (!state?.room) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: isCompact ? 0 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className={`rounded-2xl backdrop-blur-xl ${
        isCompact
          ? 'border border-purple-500/20 bg-purple-900/40 p-4'
          : 'border border-purple-500/30 bg-purple-900/20 p-6'
      }`}
    >
      <h2
        className={`font-semibold text-white mb-4 flex items-center gap-2 ${
          isCompact ? 'text-lg' : 'text-xl'
        }`}
      >
        <FaGamepad className="w-5 h-5 text-purple-400" />
        Room Settings
      </h2>
      <div className={`space-y-3 ${isCompact ? 'text-sm' : 'text-sm'}`}>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Topic:</span>
          <span className="text-white text-right">
            {state.room.topic || 'General Knowledge'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Language:</span>
          <span className="text-white">
            {state.room.language === 'id' ? '🇮🇩 Bahasa' : '🇺🇸 English'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Questions:</span>
          <span className="text-white">{state.room.num_questions}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Time per Round:</span>
          <span className="text-white">
            {formatBattleTime(state.room.round_time_sec)}
          </span>
        </div>
        {state.room.battle_mode === 'team' && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Battle Mode:</span>
            <span className="text-yellow-400 font-semibold">
              👥 Team Battle
            </span>
          </div>
        )}
      </div>

      {/* Team Scores - Only show if team battle and teams assigned */}
      {state.room.battle_mode === 'team' &&
        state.teams &&
        state.teams.length > 0 &&
        state.participants?.some(p => p.team_id) && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <TeamScoreDisplay
              teams={state.teams}
              participants={state.participants || []}
              currentSessionId={state.currentUser?.session_id}
              compact={false}
            />
          </div>
        )}
    </motion.div>
  );
}
