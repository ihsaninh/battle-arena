'use client';

import { ReactNode, useEffect, useState } from 'react';

import { SharedAnimatedBackground } from '../SharedAnimatedBackground';
import { useViewport } from '@/src/hooks/useViewport';

import { BattleNotifications } from '../BattleNotifications';

interface BattlePageShellProps {
  children: ReactNode;
}

export function BattlePageShell({ children }: BattlePageShellProps) {
  const [mounted, setMounted] = useState(false);
  const { isMobile } = useViewport(768);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/80 to-slate-900 relative overflow-hidden">
      <BattleNotifications />

      <SharedAnimatedBackground
        isMobile={isMobile}
        mounted={mounted}
        orbCount={{ mobile: 3, desktop: 8 }}
        opacity={0.2}
        animationDuration={6}
        animationDelay={0.5}
        showGridOverlay={true}
      />

      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl">
          <div className="md:rounded-3xl md:border md:border-white/10 md:bg-white/5 md:p-10 md:backdrop-blur-2xl md:shadow-2xl md:shadow-purple-500/10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
