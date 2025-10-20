"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FaHome, FaRedo, FaShare } from "react-icons/fa";

interface ActionButtonsProps {
  onShare: () => void;
}

export function ActionButtons({ onShare }: ActionButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5 }}
      className="flex flex-wrap gap-4 justify-center"
    >
      <button
        onClick={onShare}
        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
      >
        <FaShare className="w-5 h-5" />
        Share Results
      </button>

      <Link
        href="/create"
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
      >
        <FaRedo className="w-5 h-5" />
        Play Again
      </Link>

      <Link
        href="/"
        className="px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-500 hover:to-slate-500 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
      >
        <FaHome className="w-5 h-5" />
        Home
      </Link>
    </motion.div>
  );
}
