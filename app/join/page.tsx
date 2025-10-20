'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect } from 'react';

import { BattleHeader, BattlePageShell, JoinRoomForm } from '@/src/components';
import { useBattleLanding } from '@/src/hooks/useBattleLanding';

export default function BattleJoinPage() {
  return (
    <Suspense fallback={<BattleJoinFallback />}>
      <BattleJoinContent />
    </Suspense>
  );
}

function BattleJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    joinPlayerName,
    joinRoomId,
    loading,
    setGameMode,
    setJoinPlayerName,
    setJoinRoomId,
    handleJoinRoom,
  } = useBattleLanding();

  useEffect(() => {
    setGameMode('join');
  }, [setGameMode]);

  useEffect(() => {
    const urlRoomCode =
      searchParams?.get('roomCode') || searchParams?.get('roomId');

    if (urlRoomCode && joinRoomId !== urlRoomCode) {
      setJoinRoomId(urlRoomCode);
    }
  }, [searchParams, joinRoomId, setJoinRoomId]);

  const handleNavigateToLanding = useCallback(
    (mode: 'create' | 'join' | null) => {
      router.push(mode ? `/${mode}` : '/');
    },
    [router]
  );

  return (
    <BattlePageShell>
      <BattleHeader />
      <JoinRoomForm
        joinPlayerName={joinPlayerName}
        joinRoomId={joinRoomId}
        loading={loading}
        onSetJoinPlayerName={setJoinPlayerName}
        onSetJoinRoomId={setJoinRoomId}
        onHandleJoinRoom={handleJoinRoom}
        onSetGameMode={handleNavigateToLanding}
      />
    </BattlePageShell>
  );
}

function BattleJoinFallback() {
  return (
    <BattlePageShell>
      <BattleHeader />
      <div className="flex items-center justify-center py-10 text-white/70">
        Loading room details…
      </div>
    </BattlePageShell>
  );
}
