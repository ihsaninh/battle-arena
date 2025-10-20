"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tutorialSteps = [
  {
    title: "Welcome to Battle Arena! ⚔️",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-4xl md:text-6xl mb-2 md:mb-4">🎮</div>
        <p className="text-gray-300 leading-relaxed text-sm md:text-base">
          Welcome to Battle Arena! Let&apos;s learn how to play step by step
          following the actual game flow.
        </p>
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-3 md:p-4 border border-purple-500/30">
          <p className="text-xs md:text-sm text-purple-200">
            This tutorial follows the flow: Create Room → Join Room → Battle →
            Scoring → Leaderboard
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Step 1: Create Room 🏠",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-3">
          <div className="text-3xl md:text-4xl mb-2">🛡️</div>
          <p className="text-gray-300 text-sm md:text-base">
            As the host, you can configure your battle room
          </p>
        </div>

        {/* Host Details Mockup */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3 md:p-4">
          <h4 className="text-purple-300 font-semibold text-sm md:text-base mb-2">
            👑 Host Details
          </h4>
          <div className="space-y-2">
            <div className="bg-white/5 border border-white/15 rounded-lg p-2">
              <div className="text-xs text-gray-400 mb-1">Your Name *</div>
              <div className="text-white text-sm">PlayerName</div>
            </div>
            <div className="bg-white/5 border border-white/15 rounded-lg p-2">
              <div className="text-xs text-gray-400 mb-1">Battle Topic</div>
              <div className="text-white text-sm">Technology (optional)</div>
            </div>
          </div>
        </div>

        {/* Game Settings Mockup */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3 md:p-4">
          <h4 className="text-blue-300 font-semibold text-sm md:text-base mb-2">
            ⚙️ Battle Configuration
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400">Type</div>
              <div className="text-white">Multiple Choice</div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400">Language</div>
              <div className="text-white">🇺🇸 English</div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400">Players</div>
              <div className="text-white">2-12</div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400">Questions</div>
              <div className="text-white">5</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Step 2: Share Room Code 📤",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-3">
          <div className="text-3xl md:text-4xl mb-2">🔗</div>
          <p className="text-gray-300 text-sm md:text-base">
            After creating the room, share the room code with your friends
          </p>
        </div>

        {/* Room Created Success Mockup */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-green-300 text-lg font-bold mb-2">
            ✅ Room Created!
          </div>
          <div className="bg-white/10 rounded-lg p-3 mb-3">
            <div className="text-xs text-gray-400 mb-1">Room Code</div>
            <div className="text-2xl font-mono text-white tracking-wider">
              ABC123
            </div>
          </div>
          <div className="text-xs text-green-200">
            Share this code with your friends!
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-blue-300">💡</span>
            <div>
              <h4 className="text-blue-300 font-semibold text-sm">Tips</h4>
              <p className="text-gray-400 text-xs">
                Room code is valid until the battle ends. Make sure all friends
                join before starting!
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Step 3: Join Room 🚪",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-3">
          <div className="text-3xl md:text-4xl mb-2">⚔️</div>
          <p className="text-gray-300 text-sm md:text-base">
            Your friends can join by entering the room code
          </p>
        </div>

        {/* Join Room Form Mockup */}
        <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 bg-cyan-500/15 rounded-lg flex items-center justify-center">
              <span className="text-cyan-300 text-lg">🎮</span>
            </span>
            <div>
              <div className="text-white font-semibold text-sm">
                Ready to join
              </div>
              <div className="text-cyan-200 text-xs">
                Join in seconds and start scoring points
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white/5 border border-white/15 rounded-lg p-2">
              <div className="text-xs text-cyan-200 mb-1">Your Name</div>
              <div className="text-white text-sm text-center">
                Friend&apos;s Name
              </div>
            </div>
            <div className="bg-white/5 border border-white/15 rounded-lg p-2">
              <div className="text-xs text-cyan-200 mb-1">Room Code</div>
              <div className="text-white text-lg text-center font-mono tracking-wider">
                ABC123
              </div>
            </div>
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg p-2 text-center">
              <span className="text-white font-semibold text-sm">
                🎮 Join Battle
              </span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/10 rounded-lg px-3 py-2">
            <span className="text-cyan-300">👥</span>
            <span className="text-cyan-200 text-xs">
              Waiting for other players to join...
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Step 4: Battle Time! ⚔️",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-3">
          <div className="text-3xl md:text-4xl mb-2">🧠</div>
          <p className="text-gray-300 text-sm md:text-base">
            Now it&apos;s battle time! Answer questions as fast as possible
          </p>
        </div>

        {/* Question Mockup */}
        <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="bg-orange-500/20 px-2 py-1 rounded text-orange-300 text-xs">
              Question 3/5
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-red-300">⏰</span>
              <span className="text-white font-bold">28s</span>
            </div>
          </div>

          <h4 className="text-white font-bold text-sm md:text-base mb-4">
            Which programming language was developed by Google?
          </h4>

          <div className="grid grid-cols-1 gap-2">
            <div className="bg-white/10 hover:bg-blue-500/20 border border-white/20 rounded-lg p-2 cursor-pointer transition-colors">
              <span className="text-white text-sm">A. Python</span>
            </div>
            <div className="bg-white/10 hover:bg-blue-500/20 border border-white/20 rounded-lg p-2 cursor-pointer transition-colors">
              <span className="text-white text-sm">B. Go</span>
            </div>
            <div className="bg-white/10 hover:bg-blue-500/20 border border-white/20 rounded-lg p-2 cursor-pointer transition-colors">
              <span className="text-white text-sm">C. JavaScript</span>
            </div>
            <div className="bg-white/10 hover:bg-blue-500/20 border border-white/20 rounded-lg p-2 cursor-pointer transition-colors">
              <span className="text-white text-sm">D. Java</span>
            </div>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-green-300">⚡</span>
            <div>
              <h4 className="text-green-300 font-semibold text-sm">
                Speed Bonus!
              </h4>
              <p className="text-gray-400 text-xs">
                Answer within the first 10 seconds to get bonus points!
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Step 5: Scoring System 🏆",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-3">
          <div className="text-3xl md:text-4xl mb-2">📊</div>
          <p className="text-gray-300 text-sm md:text-base">
            Points are calculated based on accuracy and response time
          </p>
        </div>

        {/* Multiple Choice Scoring */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3 md:p-4">
          <h4 className="text-purple-300 font-semibold text-sm md:text-base mb-3">
            🎯 Multiple Choice Questions
          </h4>
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-green-300">✅</span>
                  <div>
                    <div className="text-green-300 font-semibold text-sm">
                      Correct Answer
                    </div>
                    <div className="text-gray-400 text-xs">
                      60 + time bonus (up to 40)
                    </div>
                  </div>
                </div>
                <div className="text-green-400 font-bold text-lg">60-100</div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-red-300">❌</span>
                  <div>
                    <div className="text-red-300 font-semibold text-sm">
                      Wrong Answer
                    </div>
                    <div className="text-gray-400 text-xs">
                      No points awarded
                    </div>
                  </div>
                </div>
                <div className="text-red-400 font-bold text-lg">0</div>
              </div>
            </div>
          </div>
        </div>

        {/* Open-ended Scoring */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3 md:p-4">
          <h4 className="text-blue-300 font-semibold text-sm md:text-base mb-3">
            📝 Open-ended Questions
          </h4>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-blue-300">🤖</span>
                <div>
                  <div className="text-blue-300 font-semibold text-sm">
                    AI Evaluation
                  </div>
                  <div className="text-gray-400 text-xs">
                    Based on content quality & accuracy
                  </div>
                </div>
              </div>
              <div className="text-blue-400 font-bold text-lg">0-100</div>
            </div>
          </div>
        </div>

        {/* Time Bonus Explanation */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-300">⚡</span>
            <div>
              <h4 className="text-yellow-300 font-semibold text-sm">
                Time Bonus (MCQ only)
              </h4>
              <p className="text-gray-400 text-xs">
                Faster answers get higher bonuses. Maximum 40 bonus points for
                instant answers!
              </p>
            </div>
          </div>
        </div>

        {/* Live Scoring Display */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
          <div className="text-center">
            <div className="text-purple-300 font-semibold text-sm mb-2">
              🔥 Your Current Score
            </div>
            <div className="text-white text-2xl font-bold">285 pts</div>
            <div className="text-gray-400 text-xs">
              3 correct out of 4 questions
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Step 6: Final Leaderboard 🏅",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-3">
          <div className="text-3xl md:text-4xl mb-2">🏆</div>
          <p className="text-gray-300 text-sm md:text-base">
            After all questions are done, see your position on the leaderboard!
          </p>
        </div>

        {/* Leaderboard Mockup */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-yellow-400">🏆</span>
            <h4 className="text-white font-bold text-sm md:text-base">
              Final Leaderboard
            </h4>
          </div>

          <div className="space-y-2">
            {/* 1st Place */}
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div className="text-yellow-400">🏆</div>
                <div>
                  <div className="text-white font-semibold text-sm">Mark</div>
                  <div className="text-yellow-300 text-xs flex items-center gap-1">
                    👑 Host
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">285</div>
                <div className="text-gray-400 text-xs">points</div>
              </div>
            </div>

            {/* 2nd Place */}
            <div className="bg-gradient-to-r from-gray-600/20 to-slate-600/20 border border-gray-400/30 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div className="text-gray-400">🏆</div>
                <div>
                  <div className="text-white font-semibold text-sm">
                    Ihsan <span className="text-cyan-400 text-sm">(You)</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">240</div>
                <div className="text-gray-400 text-xs">points</div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div className="text-amber-600">🏆</div>
                <div>
                  <div className="text-white font-semibold text-sm">
                    Fachrul
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">180</div>
                <div className="text-gray-400 text-xs">points</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-3 text-center">
          <h4 className="font-bold text-purple-300 mb-1">
            🎉 Battle Complete!
          </h4>
          <p className="text-gray-400 text-xs">Ready for another battle?</p>
        </div>
      </div>
    ),
  },
  {
    title: "Ready to Battle! 🚀",
    content: (
      <div className="text-center space-y-4">
        <div className="text-4xl md:text-6xl mb-2 md:mb-4">⚔️</div>
        <p className="text-gray-300 leading-relaxed text-sm md:text-lg">
          Now you understand the entire battle flow! Time to jump into the arena
          and prove your skills!
        </p>

        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 md:p-6 border border-purple-500/30">
          <h4 className="font-bold text-lg md:text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Final Tips! 💡
          </h4>
          <div className="text-left space-y-2 text-xs md:text-sm text-gray-300">
            <div>• Read questions carefully before answering</div>
            <div>• Answer within the first 10 seconds for bonus points</div>
            <div>
              • Don&apos;t panic if you get one wrong, focus on the next
              question
            </div>
            <div>• Most importantly: have fun! 🎉</div>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-green-500/10 rounded-lg px-4 py-2">
            <span className="text-green-300">✨</span>
            <span className="text-green-200 text-sm font-semibold">
              Good luck, warrior!
            </span>
          </div>
        </div>
      </div>
    ),
  },
];

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "ArrowRight") {
      handleNext();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg md:max-w-2xl max-h-[85vh] md:max-h-[90vh] bg-slate-900/95 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10 p-4 md:p-6">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 md:top-4 md:right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors duration-200"
                aria-label="Close modal"
              >
                <FaTimes className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
              </button>

              <div className="pr-12">
                <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  How to Play
                </h2>
                <p className="text-gray-400 text-xs md:text-sm mt-1">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 overflow-y-auto max-h-[50vh] md:max-h-[60vh]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
                    {tutorialSteps[currentStep].title}
                  </h3>
                  <div className="text-gray-300">
                    {tutorialSteps[currentStep].content}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="bg-slate-800/50 border-t border-white/10 p-4 md:p-6">
              {/* Progress indicator */}
              <div className="flex justify-center space-x-1 mb-4">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-colors duration-200 ${
                      index <= currentStep
                        ? "bg-gradient-to-r from-purple-400 to-pink-400"
                        : "bg-gray-600"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="flex items-center space-x-1 md:space-x-2 px-3 py-2 md:px-4 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-500/30"
                >
                  <FaChevronLeft className="w-3 h-3 md:w-4 md:h-4 text-gray-300" />
                  <span className="text-xs md:text-sm text-gray-300">Prev</span>
                </button>

                <div className="text-center hidden md:block">
                  <span className="text-xs text-gray-400">
                    Use ← → keys or navigation buttons
                  </span>
                </div>

                {currentStep === tutorialSteps.length - 1 ? (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 md:px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all duration-200 text-xs md:text-sm"
                  >
                    Start Battle!
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center space-x-1 md:space-x-2 px-3 py-2 md:px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all duration-200"
                  >
                    <span className="text-xs md:text-sm">Next</span>
                    <FaChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
