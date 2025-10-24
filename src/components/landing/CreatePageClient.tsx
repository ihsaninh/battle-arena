'use client';

import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { CreateRoomForm, RoomCreatedSuccess } from '@/src/components';
import { useBattleLanding } from '@/src/hooks/useBattleLanding';

export function CreatePageClient() {
  const router = useRouter();
  const {
    createPayload,
    loading,
    createdRoomCode,
    copied,
    setCreatePayload,
    setCreatedRoomCode,
    setGameMode,
    copyRoomCode,
    createRoom,
    handleJoinRoom,
  } = useBattleLanding();

  useEffect(() => {
    setGameMode('create');
  }, [setGameMode]);

  const handleNavigateToLanding = useCallback(
    (mode: 'create' | 'join' | null) => {
      router.push(mode ? `/${mode}` : '/');
    },
    [router]
  );

  return (
    <AnimatePresence mode="wait">
      {createdRoomCode ? (
        <RoomCreatedSuccess
          key="success"
          createdRoomCode={createdRoomCode}
          createPayload={createPayload}
          loading={loading}
          copied={copied}
          onSetCreatedRoomCode={setCreatedRoomCode}
          onSetGameMode={handleNavigateToLanding}
          onCopyRoomCode={copyRoomCode}
          onHandleJoinRoom={handleJoinRoom}
        />
      ) : (
        <CreateRoomForm
          key="form"
          createPayload={createPayload}
          loading={loading}
          onCreateRoom={createRoom}
          onSetCreatePayload={setCreatePayload}
          onSetGameMode={handleNavigateToLanding}
        />
      )}
    </AnimatePresence>
  );
}
