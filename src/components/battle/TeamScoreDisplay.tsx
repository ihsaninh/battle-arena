'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

import type { BattleParticipant, BattleTeam } from '@/src/types/battle';

interface TeamScoreDisplayProps {
  teams: BattleTeam[];
  participants: BattleParticipant[];
  currentSessionId?: string | null;
  compact?: boolean;
}

export function TeamScoreDisplay({
  teams,
  participants,
  currentSessionId,
  compact = false,
}: TeamScoreDisplayProps) {
  const teamData = useMemo(() => {
    return teams.map(team => {
      const teamMembers = participants.filter(p => p.team_id === team.id);
      const totalScore = teamMembers.reduce(
        (sum, member) => sum + (member.total_score || 0),
        0
      );
      return {
        ...team,
        members: teamMembers,
        calculatedScore: totalScore,
      };
    });
  }, [teams, participants]);

  const redTeam = teamData.find(t => t.team_order === 0);
  const blueTeam = teamData.find(t => t.team_order === 1);

  if (!redTeam || !blueTeam) return null;

  const isCurrentUserInRed = redTeam.members.some(
    m => m.session_id === currentSessionId
  );
  const isCurrentUserInBlue = blueTeam.members.some(
    m => m.session_id === currentSessionId
  );

  if (compact) {
    return (
      <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 border border-white/10">
        {/* Red Team */}
        <div
          className={`flex items-center gap-2 ${isCurrentUserInRed ? 'opacity-100' : 'opacity-70'}`}
        >
          <span className="text-xl">🔴</span>
          <div className="text-right">
            <div className="text-xs text-red-300 font-medium">Red</div>
            <div className="text-lg font-bold text-red-400">
              {redTeam.calculatedScore}
            </div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="text-sm font-bold text-white/50 px-2">VS</div>

        {/* Blue Team */}
        <div
          className={`flex items-center gap-2 ${isCurrentUserInBlue ? 'opacity-100' : 'opacity-70'}`}
        >
          <div className="text-left">
            <div className="text-xs text-blue-300 font-medium">Blue</div>
            <div className="text-lg font-bold text-blue-400">
              {blueTeam.calculatedScore}
            </div>
          </div>
          <span className="text-xl">🔵</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white text-center mb-3">
        Team Scores
      </h3>

      {/* Red Team */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`rounded-xl border-2 p-4 transition-all ${
          isCurrentUserInRed
            ? 'border-red-400 bg-red-500/20'
            : 'border-red-500/30 bg-red-500/10'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔴</span>
            <div>
              <h4 className="font-bold text-red-400">{redTeam.team_name}</h4>
              <p className="text-xs text-red-300/70">
                {redTeam.members.length} player
                {redTeam.members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-red-400">
              {redTeam.calculatedScore}
            </div>
            <div className="text-xs text-red-300/50">points</div>
          </div>
        </div>

        <div className="space-y-1">
          {redTeam.members.map(member => (
            <div
              key={member.session_id}
              className={`flex items-center justify-between text-sm p-2 rounded ${
                member.session_id === currentSessionId
                  ? 'bg-red-400/20 text-white font-semibold'
                  : 'text-red-200/80'
              }`}
            >
              <span className="truncate flex-1">
                {member.display_name}
                {member.is_host && ' 👑'}
              </span>
              <span className="ml-2 font-mono">{member.total_score}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Blue Team */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`rounded-xl border-2 p-4 transition-all ${
          isCurrentUserInBlue
            ? 'border-blue-400 bg-blue-500/20'
            : 'border-blue-500/30 bg-blue-500/10'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔵</span>
            <div>
              <h4 className="font-bold text-blue-400">{blueTeam.team_name}</h4>
              <p className="text-xs text-blue-300/70">
                {blueTeam.members.length} player
                {blueTeam.members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-blue-400">
              {blueTeam.calculatedScore}
            </div>
            <div className="text-xs text-blue-300/50">points</div>
          </div>
        </div>

        <div className="space-y-1">
          {blueTeam.members.map(member => (
            <div
              key={member.session_id}
              className={`flex items-center justify-between text-sm p-2 rounded ${
                member.session_id === currentSessionId
                  ? 'bg-blue-400/20 text-white font-semibold'
                  : 'text-blue-200/80'
              }`}
            >
              <span className="truncate flex-1">
                {member.display_name}
                {member.is_host && ' 👑'}
              </span>
              <span className="ml-2 font-mono">{member.total_score}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Winning Team Indicator */}
      {redTeam.calculatedScore !== blueTeam.calculatedScore && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center text-sm"
        >
          <span
            className={
              redTeam.calculatedScore > blueTeam.calculatedScore
                ? 'text-red-400'
                : 'text-blue-400'
            }
          >
            {redTeam.calculatedScore > blueTeam.calculatedScore
              ? '🔴 Red Team Leading!'
              : '🔵 Blue Team Leading!'}
          </span>
        </motion.div>
      )}
    </div>
  );
}
