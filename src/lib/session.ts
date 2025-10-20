import type { NextRequest } from "next/server";
import { battleApi, BattleSessionRequest } from "./api";

export const SESSION_COOKIE = "quiz_session_id";
export const BATTLE_SESSION_COOKIE = "battle_session_id";

export function getSessionIdFromCookies(req: NextRequest): string | null {
  try {
    const c = req.cookies.get(SESSION_COOKIE);
    return c?.value || null;
  } catch {
    return null;
  }
}

export function getBattleSessionIdFromCookies(req: NextRequest): string | null {
  try {
    const c = req.cookies.get(BATTLE_SESSION_COOKIE);
    return c?.value || null;
  } catch {
    return null;
  }
}

export const ensureSession = async (displayName: string): Promise<boolean> => {
  try {
    const name = displayName?.trim();
    if (!name) {
      return false;
    }

    const storageKey = "battle_session_fp";
    const cookieKey = "battle_session_fp";
    let fingerprint: string | null = null;

    if (typeof window !== "undefined") {
      try {
        fingerprint = window.localStorage.getItem(storageKey);
      } catch (err) {
        console.warn("[ensureSession] Unable to access localStorage", err);
      }

      if (!fingerprint && typeof document !== "undefined") {
        const cookieMatch = document.cookie
          .split("; ")
          .find((cookie) => cookie.startsWith(`${cookieKey}=`));
        fingerprint = cookieMatch ? cookieMatch.split("=")[1] : null;
      }

      if (!fingerprint) {
        const random =
          typeof window !== "undefined" &&
          "crypto" in window &&
          window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : `gen-${Math.random().toString(36).slice(2)}`;
        fingerprint = `fp-${random}`;

        try {
          window.localStorage.setItem(storageKey, fingerprint);
        } catch (err) {
          console.warn(
            "[ensureSession] Failed to persist fingerprint to localStorage",
            err
          );
        }

        if (typeof document !== "undefined") {
          document.cookie = `${cookieKey}=${fingerprint}; path=/; max-age=${
            60 * 60 * 24 * 30
          }`;
        }
      }
    }

    const payload: BattleSessionRequest = { display_name: name };
    if (fingerprint) {
      payload.fingerprint_hash = fingerprint;
    }

    await battleApi.createSession(payload);

    if (typeof window !== "undefined" && fingerprint) {
      try {
        window.localStorage.setItem(storageKey, fingerprint);
      } catch (err) {
        console.warn(
          "[ensureSession] Failed to persist fingerprint after session creation",
          err
        );
      }

      if (typeof document !== "undefined") {
        document.cookie = `${cookieKey}=${fingerprint}; path=/; max-age=${
          60 * 60 * 24 * 30
        }`;
      }
    }

    return true;
  } catch (error) {
    console.error("[ensureSession] Unexpected error", error);
    return false;
  }
};

