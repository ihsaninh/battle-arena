'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaCopy } from 'react-icons/fa';

import { useBattleStore } from '@/src/lib/store/battle-store';
import { getRoomStatusColor } from '@/src/lib/utils/formatters';

interface RoomHeaderProps {
  roomId: string;
  roomCode?: string | null;
  onCopyRoomLink: () => void;
  roomStatus?: string;
}

export function RoomHeader({
  roomId,
  roomCode,
  onCopyRoomLink,
  roomStatus = 'waiting',
}: RoomHeaderProps) {
  const { copied, connectionState } = useBattleStore();
  const rawCode = roomCode ?? roomId ?? '';
  const displayCode = rawCode ? rawCode.toUpperCase() : 'UNKNOWN';
  const codeLabel = roomCode ? 'Room Code' : 'ID';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 md:mb-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/battle"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <span className="text-lg">←</span>
              <span className="hidden sm:block">Back</span>
            </Link>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white sm:text-2xl lg:text-3xl">
                ⚔️ Battle Room
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-300 sm:text-sm">
                <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-gray-200">
                  {codeLabel}: {displayCode}
                </span>
                <span
                  className={`px-3 py-1 rounded-full border text-[0.7rem] sm:text-xs tracking-wide uppercase ${getRoomStatusColor(
                    roomStatus
                  )}`}
                >
                  {roomStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end">
          <div
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
              connectionState === 'connected'
                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                : connectionState === 'reconnecting'
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-green-400 animate-pulse'
                  : connectionState === 'reconnecting'
                    ? 'bg-yellow-400 animate-pulse'
                    : 'bg-red-400'
              }`}
            />
            <span className="capitalize">{connectionState}</span>
          </div>

          <button
            onClick={onCopyRoomLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-600/30"
          >
            <FaCopy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Share Room'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
