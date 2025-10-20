"use client";

import { motion } from "framer-motion";
import { FaTrophy } from "react-icons/fa";

export function FinishedPhase() {
  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto"
      >
        <FaTrophy className="w-12 h-12 text-white" />
      </motion.div>
      <h3 className="text-2xl font-bold text-white">Battle Complete!</h3>
      <p className="text-gray-300">Redirecting to final results...</p>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
        className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto"
      />
    </div>
  );
}
