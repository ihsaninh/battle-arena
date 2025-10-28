'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaInfo } from 'react-icons/fa';

import { AboutAuthorModal } from './AboutAuthorModal';

export function FloatingAboutButton() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 300 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAboutOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-full shadow-lg shadow-emerald-500/25 flex items-center justify-center text-white transition-all duration-200"
        aria-label="About"
      >
        <FaInfo className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AboutAuthorModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </>
  );
}
