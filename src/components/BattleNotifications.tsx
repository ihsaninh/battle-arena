"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useBattleStore } from "@/src/lib/battle-store";

interface BattleNotificationsProps {
  mobileBreakpoint?: number;
  topOffset?: {
    mobile: number;
    desktop: number;
  };
  mobilePositionClass?: string;
  desktopPositionClass?: string;
}

const DEFAULT_TOP_OFFSET = {
  mobile: 6,
  desktop: 1,
};

const DEFAULT_MOBILE_POSITION =
  "left-1/2 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2";
const DEFAULT_DESKTOP_POSITION = "right-4 min-w-[18rem] max-w-sm";

export function BattleNotifications({
  mobileBreakpoint = 768,
  topOffset = DEFAULT_TOP_OFFSET,
  mobilePositionClass = DEFAULT_MOBILE_POSITION,
  desktopPositionClass = DEFAULT_DESKTOP_POSITION,
}: BattleNotificationsProps) {
  const notifications = useBattleStore((state) => state.notifications);
  const setNotifications = useBattleStore((state) => state.setNotifications);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateViewport = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, [mounted, mobileBreakpoint]);

  useEffect(() => {
    if (!notifications.length) return;

    const timer = setTimeout(() => {
      setNotifications(notifications.slice(1));
    }, 5000);

    return () => clearTimeout(timer);
  }, [notifications, setNotifications]);

  useEffect(() => {
    if (!mounted) return;

    if (prevPathRef.current && prevPathRef.current !== pathname) {
      setNotifications([]);
    }

    prevPathRef.current = pathname;
  }, [mounted, pathname, setNotifications]);

  const dismissNotification = (index: number) => {
    setNotifications(notifications.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence>
      {notifications.map((message, index) => {
        const offset =
          (isMobile ? topOffset.mobile : topOffset.desktop) + index * 4;
        const baseClasses =
          "fixed z-50 bg-purple-600/90 backdrop-blur-xl border border-purple-500/30 rounded-xl px-4 py-3 text-white text-sm shadow-lg";
        const positionClasses = isMobile
          ? mobilePositionClass
          : desktopPositionClass;

        return (
          <motion.div
            key={`${message}-${index}`}
            initial={{
              opacity: 0,
              x: isMobile ? 0 : 100,
              y: isMobile ? 20 : 0,
            }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: isMobile ? 0 : 100, y: isMobile ? 20 : 0 }}
            transition={{ duration: 0.2 }}
            className={`${baseClasses} ${positionClasses}`}
            style={{ top: `${offset}rem` }}
          >
            <div className="flex items-start gap-3">
              <span className="flex-1 leading-snug">{message}</span>
              <button
                type="button"
                onClick={() => dismissNotification(index)}
                className="text-purple-200 transition-colors hover:text-white"
                aria-label="Dismiss notification"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
