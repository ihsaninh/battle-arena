"use client";

import { motion } from "framer-motion";

interface ConfettiBackgroundProps {
  showConfetti: boolean;
}

export const ConfettiBackground = ({ showConfetti }: ConfettiBackgroundProps) => {
  if (!showConfetti) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-3 h-3 ${
            i % 4 === 0
              ? "bg-yellow-400"
              : i % 4 === 1
              ? "bg-purple-400"
              : i % 4 === 2
              ? "bg-cyan-400"
              : "bg-pink-400"
          }`}
          style={{
            left: `${Math.random() * 100}%`,
            top: "-10px",
          }}
          animate={{
            y: ["0vh", "110vh"],
            rotate: [0, 360, 720],
            x: [0, Math.random() * 100 - 50],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 3,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};