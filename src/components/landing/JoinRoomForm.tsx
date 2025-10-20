'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  FaCheckCircle,
  FaClock,
  FaGamepad,
  FaGlobe,
  FaHourglass,
  FaLock,
  FaSearch,
  FaTimesCircle,
  FaTrophy,
  FaUsers,
} from 'react-icons/fa';

import { battleApi } from '@/src/lib/api';
import {
  getDifficultyColor,
  getDifficultyLabel,
  getStatusColor,
  getStatusLabel,
} from '@/src/lib/formatters';
import type { RoomAvailabilityResponse } from '@/src/types/api';

interface JoinRoomFormProps {
  joinPlayerName: string;
  joinRoomId: string;
  loading: boolean;
  onSetJoinPlayerName: (name: string) => void;
  onSetJoinRoomId: (id: string) => void;
  onHandleJoinRoom: (
    nameOverride?: string,
    skipSessionCreation?: boolean
  ) => void;
  onSetGameMode: (mode: 'create' | 'join' | null) => void;
}

interface RoomDetails {
  roomId: string;
  status: 'waiting' | 'active' | 'finished';
  joinable: boolean;
  capacity: number | null;
  currentParticipants: number | null;
  message?: string;
  roomCode: string;
  meta: {
    topic: string | null;
    language: string;
    numQuestions: number;
    difficulty: string | null;
    roundTimeSec: number | null;
  };
}

const normalizeRoomDetails = (
  availability: RoomAvailabilityResponse,
  requestedRoomId: string
): RoomDetails => {
  const {
    roomId,
    status,
    joinable,
    capacity,
    currentParticipants,
    message,
    roomCode,
    meta,
  } = availability;

  return {
    roomId,
    status:
      status === 'waiting' || status === 'active' || status === 'finished'
        ? status
        : 'waiting',
    joinable: Boolean(joinable),
    capacity: capacity ?? null,
    currentParticipants: currentParticipants ?? null,
    message,
    roomCode: roomCode ?? requestedRoomId.toUpperCase(),
    meta: {
      topic: meta?.topic ?? null,
      language: meta?.language ?? 'en',
      numQuestions: meta?.numQuestions ?? 0,
      difficulty: meta?.difficulty ?? null,
      roundTimeSec: meta?.roundTimeSec ?? null,
    },
  };
};

export function JoinRoomForm({
  joinPlayerName,
  joinRoomId,
  loading,
  onSetJoinPlayerName,
  onSetJoinRoomId,
  onHandleJoinRoom,
  onSetGameMode,
}: JoinRoomFormProps) {
  const [checkingRoom, setCheckingRoom] = useState(false);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const handleCheckRoom = async () => {
    if (!joinRoomId.trim()) {
      setCheckError('Please enter a room code first');
      return;
    }

    setCheckingRoom(true);
    setCheckError(null);
    setRoomDetails(null);

    try {
      const availability = await battleApi.checkRoomAvailability(
        joinRoomId.trim()
      );

      setRoomDetails(normalizeRoomDetails(availability, joinRoomId.trim()));
    } catch (error) {
      console.error('Error checking room:', error);
      const err = error as Error & { message?: string };
      setCheckError(err?.message || 'Failed to check room. Please try again.');
    } finally {
      setCheckingRoom(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto w-full"
    >
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSetGameMode(null)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚔️</span>
          <h2 className="text-2xl font-bold text-white">Join Battle</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Join Form - ORIGINAL SIZE */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-cyan-500/30 bg-cyan-900/20 p-6 md:p-8 backdrop-blur-xl h-fit"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15">
              <FaGamepad className="h-6 w-6 text-cyan-300" />
            </span>
            <div className="text-left">
              <p className="text-base md:text-lg font-semibold text-white">
                Enter Room Details
              </p>
              <p className="text-sm text-cyan-200/80 md:text-cyan-200">
                Fill in your info to join the battle
              </p>
            </div>
          </div>

          <div className="space-y-4 md:space-y-5">
            <div className="space-y-2">
              <label className="block text-xs md:text-sm font-medium text-cyan-200">
                Your Name
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                placeholder="Enter your display name"
                value={joinPlayerName}
                onChange={e => onSetJoinPlayerName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs md:text-sm font-medium text-cyan-200">
                Room Code
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all text-center text-lg tracking-[0.3em] uppercase font-mono"
                  placeholder="ABC123"
                  value={joinRoomId}
                  onChange={e => {
                    onSetJoinRoomId(e.target.value.toUpperCase().slice(0, 6));
                    setRoomDetails(null);
                    setCheckError(null);
                  }}
                  required
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleCheckRoom}
                  disabled={checkingRoom || !joinRoomId.trim()}
                  className="px-4 py-3 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 min-w-[100px]"
                  title="Check room details"
                >
                  {checkingRoom ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FaSearch className="w-4 h-4" />
                      <span className="hidden sm:inline">Check</span>
                    </>
                  )}
                </button>
              </div>
              {checkError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 flex items-center gap-1"
                >
                  <FaTimesCircle className="w-3 h-3" />
                  {checkError}
                </motion.p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onHandleJoinRoom()}
              disabled={loading || !joinRoomId.trim() || !joinPlayerName.trim()}
              className="w-full px-6 py-3 md:py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FaGamepad className="w-5 h-5" />
              )}
              {loading ? 'Joining...' : 'Join Battle'}
            </button>
          </div>
        </motion.div>

        {/* Right: Room Preview Card - COMPACT */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-purple-500/30 bg-purple-900/20 p-5 backdrop-blur-xl h-fit"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
              <FaTrophy className="h-5 w-5 text-purple-300" />
            </span>
            <div className="text-left">
              <p className="text-base font-semibold text-white">Room Preview</p>
              <p className="text-xs text-purple-200/80">
                Check details before joining
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!roomDetails && !checkError && !checkingRoom && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-dashed border-purple-500/30 flex items-center justify-center mb-3">
                  <FaSearch className="w-6 h-6 text-purple-300/50" />
                </div>
                <p className="text-purple-200/70 text-xs">
                  Enter a room code and click &quot;Check&quot;
                  <br />
                  to see room details
                </p>
              </motion.div>
            )}

            {checkingRoom && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
                <p className="text-purple-200 text-xs">Checking room...</p>
              </motion.div>
            )}

            {roomDetails && (
              <motion.div
                key="details"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-3"
              >
                {/* Room Code Display + Status */}
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Room Code
                    </p>
                    <div className="flex gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(
                          roomDetails.status
                        )}`}
                      >
                        {roomDetails.status === 'waiting' && (
                          <FaClock className="w-2.5 h-2.5" />
                        )}
                        {roomDetails.status === 'active' && (
                          <FaGamepad className="w-2.5 h-2.5" />
                        )}
                        {roomDetails.status === 'finished' && (
                          <FaTrophy className="w-2.5 h-2.5" />
                        )}
                        {getStatusLabel(roomDetails.status)}
                      </span>
                      {roomDetails.joinable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-green-500/20 text-green-300 border-green-500/30">
                          <FaCheckCircle className="w-2.5 h-2.5" />
                          Joinable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-500/20 text-red-300 border-red-500/30">
                          <FaLock className="w-2.5 h-2.5" />
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                  <code className="text-2xl font-mono font-bold text-white tracking-wider">
                    {roomDetails.roomCode}
                  </code>
                </div>

                {/* Room Info Grid - 4 columns */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Capacity */}
                  {roomDetails.capacity && (
                    <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 col-span-2">
                      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                        <FaUsers className="w-3 h-3" />
                        <p className="text-[10px] uppercase tracking-wide">
                          Players
                        </p>
                      </div>
                      <p className="text-base font-bold text-white">
                        {roomDetails.currentParticipants || 0}/
                        {roomDetails.capacity}
                      </p>
                    </div>
                  )}

                  {/* Questions */}
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 col-span-2">
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                      <FaTrophy className="w-3 h-3" />
                      <p className="text-[10px] uppercase tracking-wide">
                        Rounds
                      </p>
                    </div>
                    <p className="text-base font-bold text-white">
                      {roomDetails.meta.numQuestions}
                    </p>
                  </div>

                  {/* Language */}
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 col-span-2">
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                      <FaGlobe className="w-3 h-3" />
                      <p className="text-[10px] uppercase tracking-wide">
                        Language
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white uppercase">
                      {roomDetails.meta.language}
                    </p>
                  </div>

                  {/* Difficulty */}
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 col-span-2">
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                      <FaTrophy className="w-3 h-3" />
                      <p className="text-[10px] uppercase tracking-wide">
                        Level
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getDifficultyColor(
                        roomDetails.meta.difficulty
                      )}`}
                    >
                      {getDifficultyLabel(roomDetails.meta.difficulty)}
                    </span>
                  </div>
                </div>

                {/* Topic & Round Time - Side by Side */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Topic */}
                  {roomDetails.meta.topic && (
                    <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                        Topic
                      </p>
                      <p className="text-white text-sm font-medium">
                        {roomDetails.meta.topic}
                      </p>
                    </div>
                  )}

                  {/* Round Time */}
                  {roomDetails.meta.roundTimeSec && (
                    <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                        <FaHourglass className="w-3 h-3" />
                        <p className="text-[10px] uppercase tracking-wide">
                          Time/Round
                        </p>
                      </div>
                      <p className="text-white text-sm font-semibold">
                        {roomDetails.meta.roundTimeSec}s
                      </p>
                    </div>
                  )}
                </div>

                {/* Warning/Success Message - Compact */}
                {roomDetails.message && !roomDetails.joinable && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <FaTimesCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-red-300">
                          Cannot Join
                        </p>
                        <p className="text-[11px] text-red-200/80 mt-0.5">
                          {roomDetails.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {roomDetails.joinable && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <FaCheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-300">
                          Ready to Join!
                        </p>
                        <p className="text-[11px] text-green-200/80 mt-0.5">
                          Room is open. Enter your name and join.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
