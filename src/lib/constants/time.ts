/**
 * Time Constants
 *
 * Centralized time-related constants to avoid magic numbers
 * All values in milliseconds unless specified otherwise
 */

export const TIME_MS = {
  // Base units
  ONE_SECOND: 1000,
  ONE_MINUTE: 60_000,
  FIVE_MINUTES: 300_000,
  TEN_MINUTES: 600_000,
  ONE_HOUR: 3_600_000,
  ONE_DAY: 86_400_000,

  // Common durations
  TEN_SECONDS: 10_000,
  THIRTY_SECONDS: 30_000,
  TWO_MINUTES: 120_000,
  FIFTEEN_MINUTES: 900_000,
} as const;

/**
 * Time in seconds (for API/database usage)
 */
export const TIME_SEC = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  TEN_MINUTES: 600,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
} as const;

/**
 * Connection and timeout settings
 */
export const TIMEOUTS = {
  // Connection timeouts
  CONNECTION_TIMEOUT: 10_000, // 10 seconds
  RECONNECTION_DELAY: 1000, // 1 second
  MAX_RECONNECTION_DELAY: 30_000, // 30 seconds

  // Circuit breaker
  CIRCUIT_BREAKER_DURATION: 60_000, // 1 minute

  // Cleanup intervals
  CLEANUP_INTERVAL: 300_000, // 5 minutes
  SESSION_CLEANUP: 3_600_000, // 1 hour
} as const;

/**
 * Helper to convert seconds to milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * TIME_MS.ONE_SECOND;
}

/**
 * Helper to convert milliseconds to seconds
 */
export function msToSeconds(ms: number): number {
  return Math.floor(ms / TIME_MS.ONE_SECOND);
}

/**
 * Helper to convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * TIME_MS.ONE_MINUTE;
}

/**
 * Helper to convert milliseconds to minutes
 */
export function msToMinutes(ms: number): number {
  return Math.floor(ms / TIME_MS.ONE_MINUTE);
}
