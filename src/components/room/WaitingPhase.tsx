'use client';

import { motion } from 'framer-motion';
import {
  FaCheckCircle,
  FaClock,
  FaCrown,
  FaPlay,
  FaRocket,
  FaTimesCircle,
  FaUsers,
} from 'react-icons/fa';

import type { WaitingPhaseProps } from '@/src/types/battle';

export function WaitingPhase({
  onStartBattle,
  onToggleReady,
  isHost,
  loading,
  readyLoading,
  participants,
  currentSessionId,
  isReady,
  roomCapacity,
}: WaitingPhaseProps) {
  const capacity = roomCapacity || 2;
  const activeParticipants = participants.filter(
    p => p.connection_status !== 'offline'
  );
  const nonHostActive = activeParticipants.filter(p => !p.is_host);
  const readyParticipants = nonHostActive.filter(p => p.is_ready);
  const pendingParticipants = nonHostActive.filter(p => !p.is_ready);
  const minParticipants = Math.min(2, capacity);
  const canStart =
    activeParticipants.length >= minParticipants &&
    pendingParticipants.length === 0;

  const pendingNames = pendingParticipants
    .map(p => p.display_name || 'Peserta')
    .join(', ');

  const statusMessage = (() => {
    if (isHost) {
      if (activeParticipants.length < minParticipants) {
        return `Waiting for at least ${minParticipants} active players.`;
      }
      if (pendingParticipants.length > 0) {
        return `Waiting for players to ready up: ${pendingNames}.`;
      }
      return 'Everyone is ready. You can start the battle!';
    }

    if (activeParticipants.length < minParticipants) {
      return `Waiting for more players to join (${activeParticipants.length}/${minParticipants}).`;
    }

    return isReady
      ? "You're ready. Waiting for the host to start."
      : "Tap the button below when you're ready.";
  })();

  const totalPlayersLabel = `${activeParticipants.length}/${capacity} active`;
  const readySummary = nonHostActive.length
    ? `${readyParticipants.length}/${nonHostActive.length} players ready`
    : 'No other participants yet';

  const startButtonDisabled = loading || !canStart;
  const readyButtonDisabled = readyLoading || loading;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/40"
      >
        <FaRocket className="w-10 h-10 text-white" />
      </motion.div>
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-white">Ready to Battle?</h3>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-300">
            <span className="flex items-center gap-2">
              <FaUsers className="w-4 h-4 text-gray-400" />
              {totalPlayersLabel}
            </span>
            <span className="flex items-center gap-2">
              <FaCheckCircle className="w-4 h-4 text-emerald-400" />
              {readySummary}
            </span>
          </div>
          <p className="text-gray-300">{statusMessage}</p>
        </div>

        <div className="grid gap-3">
          {participants.map((participant, index) => {
            const isOffline = participant.connection_status === 'offline';
            const participantReady = participant.is_ready && !isOffline;
            const isSelf = participant.session_id === currentSessionId;

            let statusBadgeClass =
              'border border-yellow-400/30 text-yellow-300 bg-yellow-500/10';
            let statusIcon = <FaClock className="w-3 h-3" />;
            let statusLabel = 'WAITING';

            if (participant.is_host) {
              statusBadgeClass =
                'border border-yellow-400/30 text-yellow-200 bg-yellow-500/15';
              statusIcon = <FaCrown className="w-3 h-3" />;
              statusLabel = 'HOST';
            } else if (participantReady) {
              statusBadgeClass =
                'border border-emerald-400/40 text-emerald-200 bg-emerald-500/10';
              statusIcon = <FaCheckCircle className="w-3 h-3" />;
              statusLabel = 'READY';
            } else if (isOffline) {
              statusBadgeClass =
                'border border-red-400/30 text-red-200 bg-red-500/10';
              statusIcon = <FaTimesCircle className="w-3 h-3" />;
              statusLabel = 'OFFLINE';
            }

            return (
              <motion.div
                key={participant.session_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3 text-left">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      participant.is_host
                        ? 'border-yellow-400/40 bg-yellow-500/10 text-yellow-300'
                        : 'border-purple-400/20 bg-purple-500/10 text-purple-200'
                    }`}
                  >
                    {participant.is_host ? (
                      <FaCrown className="w-4 h-4" />
                    ) : (
                      <FaUsers className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {participant.display_name || 'Anonymous Player'}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-medium text-cyan-300">
                          (You)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-400">
                      {participant.is_host ? 'Host' : 'Peserta'}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass}`}
                >
                  {statusIcon}
                  <span>{statusLabel}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {!isHost && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onToggleReady}
              disabled={readyButtonDisabled}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                isReady
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-200 border border-blue-400/40 hover:bg-blue-500/30'
              } ${readyButtonDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {readyLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FaCheckCircle className="w-4 h-4" />
              )}
              {isReady ? 'Cancel Ready' : "I'm Ready"}
            </motion.button>
          )}

          {isHost && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onStartBattle}
              disabled={startButtonDisabled}
              className={`px-7 py-3 font-semibold rounded-xl transition-all flex items-center gap-2 ${
                canStart
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/40'
                  : 'bg-gray-700/60 text-gray-400 cursor-not-allowed border border-gray-600/50'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FaPlay className="w-5 h-5" />
              )}
              {loading
                ? 'Starting...'
                : canStart
                  ? 'Start Battle'
                  : 'Waiting for Players'}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
