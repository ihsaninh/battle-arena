'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import {
  BattleHeader,
  BattlePageShell,
  FloatingHowToPlayButton,
  GameModeSelection,
} from '@/src/components';

export default function BattleLanding() {
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
      <BattlePageShell>
        <BattleHeader />
        <GameModeSelection onSetGameMode={handleSetGameMode} />
      </BattlePageShell>
      <FloatingHowToPlayButton />
    </>
  );
}
