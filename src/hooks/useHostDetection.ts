import { useEffect, useRef } from 'react';

import { useBattleStore } from '@/src/lib/battle-store';
import type { StateResp } from '@/src/types/battle';
import { BATTLE_SESSION_COOKIE } from '@/src/lib/session';

export function useHostDetection(
  roomId: string | undefined,
  state: StateResp | undefined
) {
  const { tabId, setIsHostCache } = useBattleStore();
  const prevIsHostCacheRef = useRef<boolean | null>(null);

  // Cache host status to localStorage to prevent loss during refreshes
  useEffect(() => {
    if (state?.currentUser?.is_host !== undefined) {
      const hostStatus = state.currentUser.is_host;
      if (prevIsHostCacheRef.current !== hostStatus) {
        prevIsHostCacheRef.current = hostStatus;
        setIsHostCache(hostStatus);
      }

      if (hostStatus && roomId) {
        // Mark this tab as the host tab
        localStorage.setItem(`battle_host_tab_${roomId}`, tabId);
        localStorage.setItem(
          `battle_host_session_${roomId}`,
          state.currentUser.session_id
        );
      }
    } else if (
      setIsHostCache !== null &&
      state?.participants &&
      state.participants.length > 0 &&
      roomId
    ) {
      // If we don't have currentUser but we have participants, check if any participant with our session is host
      const currentSessionId = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${BATTLE_SESSION_COOKIE}=`))
        ?.split('=')[1];

      if (currentSessionId) {
        const hostParticipant = state?.participants?.find(
          p => p.session_id === currentSessionId && p.is_host
        );

        if (hostParticipant && prevIsHostCacheRef.current !== true) {
          prevIsHostCacheRef.current = true;
          setIsHostCache(true);
          localStorage.setItem(`battle_host_tab_${roomId}`, tabId);
          localStorage.setItem(
            `battle_host_session_${roomId}`,
            currentSessionId
          );
        }
      }
    } else if (setIsHostCache !== null && roomId) {
      // Check if this tab was the original host tab
      const hostTab = localStorage.getItem(`battle_host_tab_${roomId}`);
      const newHostStatus = hostTab === tabId;
      if (prevIsHostCacheRef.current !== newHostStatus) {
        prevIsHostCacheRef.current = newHostStatus;
        setIsHostCache(newHostStatus);
      }
    }
  }, [state?.currentUser, state?.participants, roomId, tabId, setIsHostCache]);

  const isHost = (): boolean => {
    // Check for SSR safety
    if (typeof window === 'undefined') return false;

    if (!roomId) return false;

    const hostTab = localStorage.getItem(`battle_host_tab_${roomId}`);
    const isCurrentUserHost = state?.currentUser?.is_host;

    // Check if this tab is the designated host tab
    if (hostTab === tabId) {
      return true;
    }

    // Fallback: check current user is host (for initial detection)
    if (isCurrentUserHost) {
      return true;
    }

    // Additional fallback: if we have cached host status for this tab
    const cachedHostStatus = useBattleStore.getState().isHostCache;
    if (cachedHostStatus === true) {
      return true;
    }

    return false;
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (
        roomId &&
        localStorage.getItem(`battle_host_tab_${roomId}`) === tabId
      ) {
        localStorage.removeItem(`battle_host_tab_${roomId}`);
        localStorage.removeItem(`battle_host_session_${roomId}`);
      }
    };
  }, [roomId, tabId]);

  return {
    isHost,
  };
}
