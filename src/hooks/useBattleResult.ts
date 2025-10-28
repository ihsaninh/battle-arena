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
      const timer = setTimeout(() => setShowConfetti(true), 300);

      return () => clearTimeout(timer);
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
          team_id: p?.team_id,
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
          team_id: p.team_id,
        }))
        .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
      setSortedParticipants(fallback);
    }
  }, [results?.participants, scoreboardData?.scoreboard]);

  // Calculate team scores if it's a team battle
  const isTeamBattle = results?.room?.battle_mode === 'team';
  const teams = results?.teams || [];

  const teamScores =
    isTeamBattle && teams.length > 0
      ? teams
          .map(team => {
            const teamMembers = sortedParticipants.filter(
              p => p.team_id === team.id
            );
            const totalScore = teamMembers.reduce(
              (sum, member) => sum + (member.total_score || 0),
              0
            );
            return {
              ...team,
              members: teamMembers,
              totalScore,
            };
          })
          .sort((a, b) => b.totalScore - a.totalScore)
      : [];

  const winner = (
    isTeamBattle && teamScores.length > 0
      ? {
          display_name: teamScores[0].team_name,
          total_score: teamScores[0].totalScore,
          isTeam: true as const,
        }
      : sortedParticipants[0]
  ) as FinalScoreEntry & { isTeam?: boolean };
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
    isTeamBattle,
    teamScores,
    teams,

    // State setters
    setShowAnswers,

    // Functions
    shareResults,
  };
}
