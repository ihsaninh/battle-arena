'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaQuestionCircle } from 'react-icons/fa';

import { HowToPlayModal } from './HowToPlayModal';

export function FloatingHowToPlayButton() {
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 300 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsHowToPlayOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full shadow-lg shadow-blue-500/25 flex items-center justify-center text-white transition-all duration-200"
        aria-label="How to Play"
      >
        <FaQuestionCircle className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />
    </>
  );
}
