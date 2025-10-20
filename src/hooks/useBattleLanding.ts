import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCreateRoom, useJoinRoom } from '@/src/hooks/useBattleQueries';
import { useBattleStore } from '@/src/lib/battle-store';
import { handleApiError } from '@/src/lib/client-error-handler';

type GameMode = 'create' | 'join' | null;

export function useBattleLanding() {
  const router = useRouter();

  // TanStack Query mutations
  const createRoomMutation = useCreateRoom();
  const joinRoomMutation = useJoinRoom();
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [createPayload, setCreatePayload] = useState({
    topic: '',
    hostDisplayName: '',
    language: 'en' as 'en' | 'id',
    numQuestions: 5,
    roundTimeSec: 60,
    capacity: 4,
    questionType: 'multiple-choice' as 'open-ended' | 'multiple-choice',
    difficulty: undefined as 'easy' | 'medium' | 'hard' | undefined,
  });
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const addNotification = useBattleStore(state => state.addNotification);

  // Compute loading state from mutations
  const loading = createRoomMutation.isPending || joinRoomMutation.isPending;

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPayload.hostDisplayName.trim()) {
      addNotification('Please enter your name to continue');
      return;
    }

    try {
      const { difficulty, ...restPayload } = createPayload;
      const payload = {
        ...restPayload,
        ...(difficulty ? { difficulty } : {}),
      };

      const result = await createRoomMutation.mutateAsync({
        ...payload,
        skipSessionCreation: false,
      });

      // Store room ID and code, switch to success view
      setCreatedRoomId(result.roomId);
      setCreatedRoomCode(result.roomCode);
      setJoinRoomId(result.roomId);

      // Hide the form and show success message
      setGameMode(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? `Failed to create room: ${err.message}`
          : 'Failed to create room due to an unexpected error.';
      addNotification(message);
    }
  };

  const handleJoinRoom = async (
    nameOverride?: string,
    skipSessionCreation = false
  ) => {
    const roomId = joinRoomId;
    // Ensure playerName is always a string and handle edge cases
    let playerName: string;
    if (typeof nameOverride === 'string') {
      playerName = nameOverride;
    } else if (typeof joinPlayerName === 'string') {
      playerName = joinPlayerName;
    } else {
      playerName = '';
    }

    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      addNotification('Please enter a valid Room Code');
      return;
    }
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      addNotification('Please enter your player name');
      return;
    }

    try {
      const result = await joinRoomMutation.mutateAsync({
        roomId,
        payload: { displayName: playerName.trim() },
        skipSessionCreation,
      });

      // Small delay to ensure the join is processed on the server
      await new Promise(resolve => setTimeout(resolve, 200));

      // Redirect to room using the actual room ID from response
      const actualRoomId = result.roomId || roomId;
      router.push(`/rooms/${actualRoomId}`);
    } catch (err: unknown) {
      const clientError = handleApiError(err);
      addNotification(clientError?.message || 'An error occurred');
    }
  };

  const copyRoomCode = async () => {
    if (createdRoomCode) {
      try {
        const fullUrl = `${window.location.origin}/join?roomCode=${createdRoomCode}`;
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return {
    // State values
    gameMode,
    createPayload,
    joinPlayerName,
    joinRoomId,
    loading,
    createdRoomId,
    createdRoomCode,
    copied,

    // State setters
    setGameMode,
    setCreatePayload,
    setJoinPlayerName,
    setJoinRoomId,
    setCreatedRoomId,
    setCreatedRoomCode,
    setCopied,

    // Functions
    createRoom,
    handleJoinRoom,
    copyRoomCode,
  };
}
