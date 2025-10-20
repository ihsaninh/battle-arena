'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface SharedAnimatedBackgroundProps {
  isMobile: boolean;
  mounted: boolean;
  orbCount?: { mobile: number; desktop: number };
  opacity?: number;
  animationDuration?: number;
  animationDelay?: number;
  showGridOverlay?: boolean;
}

export const SharedAnimatedBackground = ({
  isMobile,
  mounted,
  orbCount = { mobile: 3, desktop: 6 },
  opacity = 0.1,
  animationDuration = 8,
  animationDelay = 1.2,
  showGridOverlay = false,
}: SharedAnimatedBackgroundProps) => {
  const orbPositions = useMemo(() => {
    if (!mounted) return [] as Array<{ left: string; top: string }>;
    // Generate orbs with client-only random positions to avoid SSR mismatch
    const count = isMobile ? orbCount.mobile : orbCount.desktop;
    return Array.from({ length: count }, () => ({
      left: `${Math.round(Math.random() * 10000) / 100}%`,
      top: `${Math.round(Math.random() * 10000) / 100}%`,
    }));
  }, [mounted, isMobile, orbCount.mobile, orbCount.desktop]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {orbPositions.map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute w-32 h-32 rounded-full opacity-${Math.round(opacity * 100)} blur-xl ${
            i % 3 === 0
              ? 'bg-gradient-to-br from-purple-400 to-pink-400'
              : i % 3 === 1
                ? 'bg-gradient-to-br from-blue-400 to-cyan-400'
                : 'bg-gradient-to-br from-emerald-400 to-teal-400'
          }`}
          style={{
            left: pos.left,
            top: pos.top,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            scale: [1, 1.1, 1],
            opacity: [opacity, opacity * 2, opacity],
          }}
          transition={{
            duration: animationDuration + i,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * animationDelay,
          }}
        />
      ))}
      {showGridOverlay && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_90%_60%_at_50%_0%,#000_70%,transparent_120%)]" />
      )}
    </div>
  );
};
