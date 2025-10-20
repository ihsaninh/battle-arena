"use client";

import { useEffect, useState } from "react";

import {
  BattleConnectionError,
  BattleLoadingState,
  BattleNotifications,
  ConnectionStatusIndicator,
  FloatingParticipantsButton,
  GameArea,
  Participants,
  QuickSubmitButton,
  RoomHeader,
  RoomInfo,
} from "@/src/components";
import { useBattleLogic } from "@/src/hooks/useBattleLogic";
import { useBattleStore } from "@/src/lib/battle-store";
import { SharedAnimatedBackground } from "@/src/components/SharedAnimatedBackground";
import { useViewport } from "@/src/hooks/useViewport";

export default function BattleRoom() {
  const [mounted, setMounted] = useState(false);
  const { isMobile } = useViewport(1024);
  const {
    // State values
    roomId,
    timeLeft,
    state,
    answeredCount,
    totalParticipants,
    iHaveAnswered,
    loading,
    connectionState,
    connectionError,

    // Functions
    copyRoomLink,
    startBattle,
    submitAnswer,
    advanceFromScoreboard,
    toggleReadyStatus,

    // Derived values
    isHost,
    scoreboard,
    advanceFromScoreboardLoading,
    readyStatusLoading,
  } = useBattleLogic();

  // Access to selected answer for quick submit validation
  const { selectedChoiceId, answer } = useBattleStore();

  useEffect(() => setMounted(true), []);

  // Show connection error message
  if (connectionState === "disconnected" && connectionError) {
    return (
      <BattleConnectionError
        connectionError={connectionError}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  if (!state?.room) {
    return <BattleLoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/80 to-slate-900 relative overflow-hidden">
      {/* Connection Status Indicator */}
      <ConnectionStatusIndicator
        status={connectionState as "connected" | "disconnected"}
      />

      {/* Animated Background */}
      <SharedAnimatedBackground
        isMobile={isMobile}
        mounted={mounted}
        orbCount={{ mobile: 3, desktop: 6 }}
        opacity={0.1}
        animationDuration={8}
        animationDelay={1.2}
        showGridOverlay={false}
      />

      {/* Notifications */}
      <BattleNotifications
        mobileBreakpoint={1024}
        desktopPositionClass="right-4"
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="md:rounded-3xl md:border md:border-white/10 md:bg-white/5 md:p-8 md:backdrop-blur-2xl md:shadow-2xl md:shadow-purple-500/10">
            {/* Room Header */}
            <RoomHeader
              roomId={roomId}
              roomCode={state?.room?.room_code}
              onCopyRoomLink={copyRoomLink}
              roomStatus={state?.room?.status || "waiting"}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Room Info & Participants - Hidden on mobile */}
              <div className="hidden lg:block lg:col-span-1 space-y-6">
                {/* Room Info */}
                <RoomInfo roomId={roomId} />

                {/* Participants */}
                <Participants roomId={roomId} />
              </div>

              {/* Right Column - Game Area - Full width on mobile */}
              <div className="col-span-1 lg:col-span-2">
                <GameArea
                  timeLeft={timeLeft}
                  answeredCount={answeredCount}
                  onStartBattle={startBattle}
                  onSubmitAnswer={submitAnswer}
                  isHost={isHost}
                  iHaveAnswered={iHaveAnswered}
                  loading={loading}
                  totalParticipants={totalParticipants}
                  scoreboard={scoreboard}
                  onAdvanceFromScoreboard={advanceFromScoreboard}
                  advanceFromScoreboardLoading={advanceFromScoreboardLoading}
                  onToggleReady={toggleReadyStatus}
                  readyLoading={readyStatusLoading}
                />
              </div>
            </div>

            {/* Floating Participants Button - Only on mobile */}
            <FloatingParticipantsButton
              roomId={roomId}
              participantCount={state?.participants?.length || 0}
            />

            {/* Quick Submit Button - Only during answering phase on mobile */}
            <QuickSubmitButton
              timeLeft={timeLeft}
              iHaveAnswered={iHaveAnswered}
              loading={loading}
              state={state}
              selectedChoiceId={selectedChoiceId ?? undefined}
              answer={answer}
              submitAnswer={submitAnswer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
