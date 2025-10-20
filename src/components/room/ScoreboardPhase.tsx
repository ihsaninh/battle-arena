'use client';

import { animate, LayoutGroup, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArrowRight,
  FaCheckCircle,
  FaCrown,
  FaInfoCircle,
} from 'react-icons/fa';

import { useBattleStore } from '@/src/lib/battle-store';
import type {
  RoundScoreboardEntry,
  ScoreboardPhaseProps,
} from '@/src/types/battle';

type ScoreboardEntryWithMeta = RoundScoreboardEntry & {
  hadExplicitRoundScore: boolean;
};

type AnimatedNumberProps = {
  value: number | string;
  className?: string;
  duration?: number;
  format?: (value: number) => string;
  initialValue?: number;
};

function AnimatedNumber({
  value,
  className,
  duration = 0.6,
  format,
  initialValue,
}: AnimatedNumberProps) {
  const targetValue = useMemo(() => {
    const numeric =
      typeof value === 'number' ? value : Number.parseFloat(String(value ?? 0));
    return Number.isFinite(numeric) ? numeric : 0;
  }, [value]);

  const startingValue = initialValue ?? targetValue;
  const [displayValue, setDisplayValue] = useState(startingValue);
  const previousValueRef = useRef(startingValue);

  useEffect(() => {
    if (previousValueRef.current === targetValue) {
      return;
    }

    const controls = animate(previousValueRef.current, targetValue, {
      duration,
      ease: 'easeOut',
      onUpdate: latest => setDisplayValue(latest),
      onComplete: () => setDisplayValue(targetValue),
    });

    previousValueRef.current = targetValue;

    return () => {
      controls.stop();
    };
  }, [targetValue, duration]);

  const roundedValue = Number.isFinite(displayValue)
    ? Math.round(displayValue)
    : targetValue;
  const formattedValue = format
    ? format(roundedValue)
    : String(Number.isFinite(roundedValue) ? roundedValue : targetValue);

  return <span className={className}>{formattedValue}</span>;
}

function areEntriesEqual(
  a: ScoreboardEntryWithMeta[] | undefined,
  b: ScoreboardEntryWithMeta[] | undefined
) {
  if (!a || !b) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    const entryA = a[i];
    const entryB = b[i];
    if (
      entryA.sessionId !== entryB.sessionId ||
      entryA.totalScore !== entryB.totalScore ||
      entryA.roundScore !== entryB.roundScore
    ) {
      return false;
    }
  }
  return true;
}

const toNumber = (value: unknown): number => {
  const numeric = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(numeric) ? numeric : 0;
};

function sanitizeEntries(
  entries: RoundScoreboardEntry[],
  totalOverrides?: Map<string, number>
): ScoreboardEntryWithMeta[] {
  return entries.map(entry => {
    const hasRoundScore =
      entry.roundScore !== null && entry.roundScore !== undefined;

    return {
      ...entry,
      roundScore: toNumber(entry.roundScore),
      totalScore: toNumber(
        totalOverrides?.get(entry.sessionId) ?? entry.totalScore
      ),
      hadExplicitRoundScore: hasRoundScore,
    };
  });
}

export function ScoreboardPhase({
  scoreboard,
  isHost,
  loading,
  onAdvance,
  currentSessionId,
  totalRounds,
}: ScoreboardPhaseProps) {
  const previousScoreboard = useBattleStore(state => state.previousScoreboard);
  const participants = useBattleStore(state => state.state?.participants ?? []);
  const participantTotalsMap = useMemo(() => {
    const map = new Map<string, number>();
    participants.forEach(participant => {
      map.set(participant.session_id, toNumber(participant.total_score));
    });
    return map;
  }, [participants]);
  const sanitizedPreviousEntries = useMemo(
    () =>
      previousScoreboard?.entries
        ? sanitizeEntries(previousScoreboard.entries)
        : undefined,
    [previousScoreboard]
  );

  const sanitizedCurrentEntries = useMemo(
    () => sanitizeEntries(scoreboard.entries, participantTotalsMap),
    [scoreboard.entries, participantTotalsMap]
  );

  const previousEntryMap = useMemo(() => {
    const map = new Map<string, ScoreboardEntryWithMeta>();
    sanitizedPreviousEntries?.forEach(entry => {
      map.set(entry.sessionId, entry);
    });
    return map;
  }, [sanitizedPreviousEntries]);

  const [animatedEntries, setAnimatedEntries] = useState<
    ScoreboardEntryWithMeta[]
  >(() => {
    const sourceEntries =
      sanitizedPreviousEntries?.length &&
      !areEntriesEqual(sanitizedPreviousEntries, sanitizedCurrentEntries)
        ? sanitizedPreviousEntries
        : sanitizedCurrentEntries;

    return sourceEntries.map(entry => ({ ...entry }));
  });

  const isFinalRound = !scoreboard.hasMoreRounds;
  const title = isFinalRound
    ? 'Final Standings'
    : `Round ${scoreboard.roundNo} Scoreboard`;
  const subtitle = isFinalRound
    ? 'Great job! These are the final results.'
    : "Here's how everyone did this round.";

  const questionSummary = scoreboard.question ?? null;
  const answersSummary = useMemo(
    () => scoreboard.answers ?? [],
    [scoreboard.answers]
  );
  const myAnswerSummary = useMemo(() => {
    if (!currentSessionId) return null;
    return (
      answersSummary.find(entry => entry.sessionId === currentSessionId) ?? null
    );
  }, [answersSummary, currentSessionId]);

  const myChoice = useMemo(() => {
    if (!questionSummary?.choices || !myAnswerSummary?.choiceId) return null;
    return questionSummary.choices.find(
      choice => choice.id === myAnswerSummary.choiceId
    );
  }, [questionSummary?.choices, myAnswerSummary?.choiceId]);

  useEffect(() => {
    const hasChanged = !areEntriesEqual(
      animatedEntries,
      sanitizedCurrentEntries
    );
    if (!hasChanged) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setAnimatedEntries(sanitizedCurrentEntries.map(entry => ({ ...entry })));
    });

    return () => cancelAnimationFrame(frame);
  }, [animatedEntries, sanitizedCurrentEntries]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-500/10 px-4 py-1 text-sm font-semibold text-yellow-200">
          <FaCrown className="h-4 w-4" />
          {isFinalRound ? 'Finale' : `Round ${scoreboard.roundNo}`}
        </div>
        <h3 className="text-2xl font-bold text-white md:text-3xl">{title}</h3>
        <p className="mt-2 text-base text-white/70 md:text-lg">{subtitle}</p>
      </motion.div>

      <LayoutGroup>
        <motion.div layout className="w-full max-w-3xl space-y-3">
          {animatedEntries.map((entry, index) => {
            const isSelf = entry.sessionId === currentSessionId;
            const rank = index + 1;
            const tierColor =
              rank === 1
                ? 'from-yellow-500/20 to-amber-500/20 border-yellow-400/30'
                : rank === 2
                  ? 'from-slate-500/30 to-indigo-500/20 border-slate-300/30'
                  : rank === 3
                    ? 'from-amber-500/15 to-orange-500/15 border-amber-400/30'
                    : 'from-slate-800/40 to-slate-700/30 border-white/10';

            const previousEntry = previousEntryMap.get(entry.sessionId);

            const displayRoundScore =
              scoreboard.roundNo === 1
                ? entry.totalScore
                : (entry.roundScore ?? 0);
            const initialRoundScore = scoreboard.roundNo === 1 ? 0 : undefined;

            const initialTotalPoints =
              previousEntry?.totalScore ??
              Math.max(entry.totalScore - displayRoundScore, 0);

            return (
              <motion.div
                key={entry.sessionId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  layout: { type: 'spring', stiffness: 600, damping: 45 },
                  opacity: { duration: 0.25 },
                  y: { duration: 0.25 },
                }}
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${tierColor} px-5 py-4 shadow-lg transition-transform md:px-6 md:py-5 ${
                  isSelf ? 'ring-2 ring-cyan-400/60' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-white/80 md:text-3xl">
                      #{rank}
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-white md:text-xl">
                        {entry.displayName}
                      </p>
                      <p className="text-sm text-white/60">
                        {isSelf ? 'You' : 'Participant'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-white/50">
                        Round Score
                      </p>
                      <AnimatedNumber
                        key={`${entry.sessionId}-round-score-${scoreboard.roundNo}`}
                        value={displayRoundScore}
                        className="text-lg font-semibold text-emerald-300 md:text-xl"
                        format={val => `${val >= 0 ? '+' : ''}${val}`}
                        initialValue={initialRoundScore}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-white/50">
                        Total Points
                      </p>
                      <AnimatedNumber
                        value={entry.totalScore}
                        className="text-2xl font-bold text-white md:text-3xl"
                        format={val => val.toLocaleString()}
                        initialValue={initialTotalPoints}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {questionSummary?.prompt && (
          <motion.div
            layout
            className="w-full max-w-3xl rounded-2xl border border-purple-400/20 bg-purple-900/30 p-5 text-left shadow-lg shadow-purple-900/20 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-purple-200">
              <FaInfoCircle className="h-4 w-4" />
              <span>Round Question Recap</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {questionSummary.prompt}
            </p>

            {questionSummary.type === 'multiple-choice' &&
              questionSummary.choices &&
              questionSummary.choices.length > 0 && (
                <div className="mt-4 space-y-2 text-sm">
                  {questionSummary.choices.map(choice => {
                    const isCorrectChoice = choice.isCorrect;
                    const isMySelection = choice.id === myChoice?.id;
                    const baseClass =
                      'flex items-center gap-3 rounded-xl border px-4 py-2 transition-colors';
                    const stateClass = isCorrectChoice
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                      : isMySelection
                        ? 'border-red-400/40 bg-red-500/10 text-red-100'
                        : 'border-white/10 bg-white/5 text-white/80';

                    return (
                      <div
                        key={choice.id}
                        className={`${baseClass} ${stateClass}`}
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                            isMySelection
                              ? 'border-white bg-white'
                              : 'border-white/40'
                          }`}
                        >
                          {isMySelection && (
                            <span className="h-2.5 w-2.5 rounded-full bg-current" />
                          )}
                        </div>
                        <span className="flex-1 text-sm font-medium text-white">
                          {choice.text}
                        </span>
                        {isCorrectChoice && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                            <FaCheckCircle className="h-3 w-3" />
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            {questionSummary.type !== 'multiple-choice' &&
              questionSummary.rubricNotes && (
                <p className="mt-4 text-sm text-white/70">
                  Tip: {questionSummary.rubricNotes}
                </p>
              )}
          </motion.div>
        )}
      </LayoutGroup>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-2 flex w-full max-w-md flex-col items-center gap-4"
      >
        {isHost ? (
          <button
            onClick={onAdvance}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaArrowRight className="h-5 w-5" />
            {loading
              ? 'Processing...'
              : scoreboard.hasMoreRounds
                ? 'Start Next Round'
                : 'Finish Battle'}
          </button>
        ) : (
          <p className="text-center text-sm text-white/60">
            Waiting for the host to{' '}
            {scoreboard.hasMoreRounds
              ? 'start the next round'
              : 'finish the battle'}
            ...
          </p>
        )}

        <p className="text-xs text-white/40">
          Round {scoreboard.roundNo} / {totalRounds}
        </p>
      </motion.div>
    </div>
  );
}
