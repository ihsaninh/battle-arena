"use client";

import { motion } from "framer-motion";
import {
  FaChevronDown,
  FaChevronUp,
  FaQuestionCircle,
  FaStar,
} from "react-icons/fa";

import type { UserAnswersProps } from "@/src/types/battle";

export function UserAnswers({
  userAnswers,
  totalAnswers,
  showAnswers,
  onToggleShowAnswers,
}: UserAnswersProps) {
  if (userAnswers.length === 0) return null;

  const totalQuestions = totalAnswers || userAnswers.length;
  const answeredCount = userAnswers.filter((a) => a.wasAnswered).length;
  const totalScore = userAnswers.reduce((sum, a) => sum + a.score, 0);
  const avgScore =
    totalQuestions > 0 ? Math.round(totalScore / totalQuestions) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.3 }}
      className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8"
    >
      <button
        onClick={onToggleShowAnswers}
        className="w-full flex items-center justify-between text-left mb-4 hover:bg-white/5 rounded-xl p-2 transition-colors"
      >
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <FaQuestionCircle className="w-6 h-6 text-blue-400" />
          Your Quiz Performance
          <span className="text-lg text-gray-400 font-normal">
            ({answeredCount}/{totalQuestions} answered)
          </span>
        </h3>
        {showAnswers ? (
          <FaChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <FaChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {showAnswers && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {userAnswers.map((answer, index) => (
            <motion.div
              key={answer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-sm font-semibold">
                      Round {answer.roundNo}
                    </span>
                    {answer.question && (
                      <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg text-xs">
                        Difficulty: {answer.question.difficulty}/3
                      </span>
                    )}
                  </div>
                  {answer.question && (
                    <p className="text-white font-medium mb-2">
                      {answer.question.prompt}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FaStar className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 font-bold">
                    {answer.score} pts
                  </span>
                </div>
              </div>

              {/* User Answer (supports MCQ) */}
              <div className="mb-3 space-y-2">
                <div>
                  <h4 className="text-gray-300 text-sm font-medium mb-1">
                    Your Answer:
                  </h4>
                  <div
                    className={`rounded-lg border p-3 ${
                      answer.wasAnswered
                        ? "bg-cyan-500/10 border-cyan-500/20"
                        : "bg-gray-500/10 border-gray-500/20"
                    }`}
                  >
                    <p
                      className={
                        answer.wasAnswered
                          ? "text-cyan-100"
                          : "text-gray-300 italic"
                      }
                    >
                      {answer.answer}
                    </p>
                  </div>
                </div>

                {answer.correctAnswer !== undefined && (
                  <div>
                    <h4 className="text-gray-300 text-sm font-medium mb-1">
                      Correct Answer:
                    </h4>
                    <div
                      className={`rounded-lg p-3 border ${
                        answer.isCorrect
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-red-500/10 border-red-500/20"
                      }`}
                    >
                      <p className="text-white">
                        {answer.correctAnswer}
                        {answer.isCorrect === true
                          ? " ✅"
                          : answer.wasAnswered
                          ? " ❌"
                          : ""}
                      </p>
                      {typeof answer.timeMs === "number" && (
                        <p className="text-xs text-gray-300 mt-1">
                          Time: {Math.round(answer.timeMs / 100) / 10}s
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Feedback (hidden for MCQ) */}
              {answer.correctAnswer === undefined && answer.feedback && (
                <div>
                  <h4 className="text-gray-300 text-sm font-medium mb-1">
                    AI Feedback:
                  </h4>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-emerald-100 text-sm leading-relaxed">
                      {answer.feedback}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-300">
                {answeredCount}
              </div>
              <div className="text-sm text-gray-300">Questions Answered</div>
            </div>
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-300">
                {totalScore}
              </div>
              <div className="text-sm text-gray-300">Total Points</div>
            </div>
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-300">
                {avgScore}
              </div>
              <div className="text-sm text-gray-300">Avg Score/Question</div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
