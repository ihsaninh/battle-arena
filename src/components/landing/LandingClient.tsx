'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { GameModeSelection } from '@/src/components';

export function LandingClient() {
  const router = useRouter();

  const handleSetGameMode = useCallback(
    (mode: 'create' | 'join' | null) => {
      if (!mode) return;
      router.push(`/${mode}`);
    },
    [router]
  );

  return (
    <>
      <GameModeSelection onSetGameMode={handleSetGameMode} />
    </>
  );
}
