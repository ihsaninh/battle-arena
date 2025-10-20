import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  useRoomStats,
  useScoreboard,
  useUserAnswers,
} from '@/src/hooks/useBattleQueries';
import type { FinalScoreEntry, ScoreboardEntry } from '@/src/types/battle';

export function useBattleResult() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id;

  // TanStack Query hooks
  const { data: results, isLoading: loading } = useRoomStats(roomId, {
    enabled: !!roomId,
  });

  const { data: userAnswers, isLoading: answersLoading } = useUserAnswers(
    roomId,
    { enabled: !!roomId }
  );

  const { data: scoreboardData } = useScoreboard(roomId, { enabled: !!roomId });

  // Local UI state
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  // Show confetti when results load
  useEffect(() => {
    if (results && !loading) {
      setTimeout(() => setShowConfetti(true), 300);
    }
  }, [results, loading]);

  const [sortedParticipants, setSortedParticipants] = useState<
    FinalScoreEntry[]
  >([]);

  useEffect(() => {
    if (!results?.participants) return;

    // Use scoreboard data if available, otherwise fallback to simple sorting
    if (scoreboardData?.scoreboard?.length) {
      const ordered = scoreboardData.scoreboard.map((b: ScoreboardEntry) => {
        const p = results.participants!.find(x => x.session_id === b.sessionId);
        return {
          session_id: b.sessionId,
          display_name: b.displayName,
          total_score: b.totalScore,
          is_host: p?.is_host,
        } as FinalScoreEntry;
      });
      setSortedParticipants(ordered);
    } else {
      // Fallback: sort by score only
      const fallback = [...(results.participants || [])]
        .map(p => ({
          session_id: p.session_id,
          display_name: p.display_name,
          total_score: p.total_score,
          is_host: p.is_host,
        }))
        .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
      setSortedParticipants(fallback);
    }
  }, [results?.participants, scoreboardData?.scoreboard]);

  const winner = sortedParticipants[0];
  const currentUserRank =
    sortedParticipants.findIndex(
      p => p.session_id === results?.currentUser?.session_id
    ) + 1;

  const shareResults = () => {
    const text = `I just completed a quiz battle! 🏆 Final score: ${
      results?.currentUser?.total_score || 0
    } points. Check out the results!`;
    const resultUrl = `${window.location.origin}/result/${roomId}`;

    if (navigator.share) {
      navigator.share({
        title: 'Quiz Battle Results',
        text,
        url: resultUrl,
      });
    } else {
      navigator.clipboard.writeText(text + ' ' + resultUrl);
      alert('Results copied to clipboard!');
    }
  };

  return {
    // State values
    roomId,
    results,
    userAnswers,
    loading,
    answersLoading,
    showConfetti,
    showAnswers,
    sortedParticipants,
    winner,
    currentUserRank,

    // State setters
    setShowAnswers,

    // Functions
    shareResults,
  };
}
