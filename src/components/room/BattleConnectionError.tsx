"use client";

import { motion } from "framer-motion";

interface ConnectionErrorProps {
  connectionError: string;
  onRefresh: () => void;
}

export const BattleConnectionError = ({
  connectionError,
  onRefresh,
}: ConnectionErrorProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md mx-auto p-6"
      >
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
        <p className="text-white/70 mb-4">{connectionError}</p>
        <button
          onClick={onRefresh}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Refresh Page
        </button>
      </motion.div>
    </div>
  );
};
