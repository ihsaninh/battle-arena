'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface AboutAuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutAuthorModal({ isOpen, onClose }: AboutAuthorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-slate-900/95 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10 p-4 md:p-6">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 md:top-4 md:right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors duration-200"
                aria-label="Close modal"
              >
                <FaTimes className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
              </button>

              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pr-10">
                About This Project
              </h2>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-3">⚔️</div>
                <h3 className="text-white font-bold text-lg">Battle Arena</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Real-time Knowledge Battle Platform
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-purple-300 font-semibold text-sm mb-2">
                  Created by
                </h4>
                <p className="text-white text-sm font-medium">
                  Ihsan Nurul Habib
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Software Engineer — Frontend & Mobile
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-gray-300 text-sm leading-relaxed">
                  A modern real-time battle platform where users can challenge
                  their friends with AI-generated questions, compete on
                  leaderboards, and have fun while learning.
                </p>
              </div>

              <div className="border-t border-white/10 pt-3">
                <p className="text-gray-400 text-xs text-center">
                  <span className="text-purple-300">Built with:</span>
                </p>
                <p className="text-gray-400 text-xs text-center mt-1">
                  Next.js • TypeScript • Supabase • Tailwind CSS • Framer Motion
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-800/50 border-t border-white/10 p-4 md:p-6">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all duration-200 text-sm"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
