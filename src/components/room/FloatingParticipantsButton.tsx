'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { FaChevronUp, FaInfo, FaUsers } from 'react-icons/fa';

import { useBattleStore } from '@/src/lib/store/battle-store';

import { Participants } from './Participants';
import { RoomInfo } from './RoomInfo';

interface FloatingParticipantsButtonProps {
  roomId: string;
  participantCount: number;
}

export function FloatingParticipantsButton({
  roomId,
  participantCount,
}: FloatingParticipantsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'roomInfo'>(
    'participants'
  );

  const { answerStatus } = useBattleStore();

  // Count answered participants for visual indicator
  const answeredCount = answerStatus?.totalAnswered || 0;
  const hasActivity = answeredCount > 0;

  return (
    <>
      {/* Floating Button - Only visible on mobile */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{
          scale: 1,
          y: hasActivity ? [0, -5, 0] : 0,
        }}
        transition={{
          scale: { duration: 0.3 },
          y: {
            duration: 1.5,
            repeat: hasActivity ? Infinity : 0,
            ease: 'easeInOut',
          },
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 lg:hidden bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center shadow-xl border border-blue-500/30 backdrop-blur-sm"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 5rem)', // Avoid iOS home indicator
        }}
        aria-label="Show room info and participants"
      >
        <div className="relative">
          <FaUsers className="w-6 h-6" />
          {participantCount > 0 && (
            <motion.span
              animate={{ scale: hasActivity ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.6, repeat: hasActivity ? Infinity : 0 }}
              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold border-2 border-white"
            >
              {participantCount}
            </motion.span>
          )}
          {hasActivity && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-green-400 rounded-full -z-10"
            />
          )}
        </div>
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                height: isCollapsed ? 'auto' : 'auto',
              }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-slate-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-hidden shadow-2xl"
            >
              {/* Header with Tabs and Collapse */}
              <div className="border-b border-white/10">
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <motion.div
                    animate={{ scaleX: isCollapsed ? 0.7 : 1 }}
                    className="w-12 h-1 bg-white/30 rounded-full"
                  />
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTab('participants')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeTab === 'participants'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <FaUsers className="w-4 h-4" />
                      Players ({participantCount})
                      {hasActivity && (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-2 h-2 bg-green-400 rounded-full"
                        />
                      )}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTab('roomInfo')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeTab === 'roomInfo'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <FaInfo className="w-4 h-4" />
                      Room Info
                    </motion.button>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                      aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      <motion.div
                        animate={{ rotate: isCollapsed ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <FaChevronUp className="w-4 h-4" />
                      </motion.div>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                      aria-label="Close"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      initial={{ y: 20 }}
                      animate={{ y: 0 }}
                      exit={{ y: -20 }}
                      className="p-4 overflow-y-auto max-h-[calc(85vh-120px)]"
                    >
                      {activeTab === 'participants' ? (
                        <Participants roomId={roomId} variant="compact" />
                      ) : (
                        <RoomInfo roomId={roomId} variant="compact" />
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
