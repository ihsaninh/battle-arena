'use client';

import {
  ActionButtons,
  BattleResultLoadingState,
  ConfettiBackground,
  Leaderboard,
  ResultHeader,
  UserAnswers,
  WinnerSpotlight,
} from '@/src/components';
import { useBattleResult } from '@/src/hooks/useBattleResult';

export function ResultPageClient() {
  const {
    // State values
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
  } = useBattleResult();

  if (loading) {
    return <BattleResultLoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 relative overflow-hidden">
      {/* Confetti Background Animation */}
      <ConfettiBackground showConfetti={showConfetti} />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <ResultHeader
            topic={results?.room?.topic}
            numQuestions={results?.room?.num_questions}
            userScore={results?.currentUser?.total_score}
            userRank={currentUserRank}
          />

          {/* Winner Spotlight */}
          <WinnerSpotlight
            winnerName={winner?.display_name}
            winnerScore={winner?.total_score}
            isTeam={isTeamBattle && winner?.isTeam}
          />

          {/* Final Leaderboard */}
          <Leaderboard
            participants={sortedParticipants}
            currentUserId={results?.currentUser?.session_id}
            isTeamBattle={isTeamBattle}
            teamScores={teamScores}
            teams={teams}
          />

          {/* User Answers Section */}
          {answersLoading && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8 text-center text-white/70">
              Loading your round-by-round answers...
            </div>
          )}
          {userAnswers && userAnswers.answers.length > 0 && (
            <UserAnswers
              userAnswers={userAnswers.answers}
              totalAnswers={userAnswers.totalAnswers}
              showAnswers={showAnswers}
              onToggleShowAnswers={() => setShowAnswers(!showAnswers)}
            />
          )}

          {/* Action Buttons */}
          <ActionButtons onShare={shareResults} />
        </div>
      </div>
    </div>
  );
}
