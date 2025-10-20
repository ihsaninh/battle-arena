import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter
// In production, consider using Redis or a more robust solution
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number = 60000,
    private maxRequests: number = 10
  ) {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, 300000);
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    if (entry.count >= this.maxRequests) {
      return true;
    }

    entry.count++;
    return false;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.store.get(identifier);
    if (!entry) return this.maxRequests;
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.store.get(identifier);
    return entry?.resetTime || 0;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Different rate limiters for different endpoints
export const generalLimiter = new RateLimiter(60000, 30); // 30 requests per minute
export const battleActionLimiter = new RateLimiter(10000, 5); // 5 battle actions per 10 seconds
export const answerSubmitLimiter = new RateLimiter(10000, 5); // 5 answer submissions per 10 seconds

export function checkRateLimit(
  req: NextRequest,
  limiter: RateLimiter,
  identifier?: string
): {
  limited: boolean;
  response?: NextResponse;
  remaining: number;
  resetTime: number;
} {
  // Use IP address as identifier, or custom identifier
  const clientId = identifier || getClientIdentifier(req);

  const isLimited = limiter.isRateLimited(clientId);
  const remaining = limiter.getRemainingRequests(clientId);
  const resetTime = limiter.getResetTime(clientId);

  if (isLimited) {
    const response = NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
        },
      }
    );
    return { limited: true, response, remaining, resetTime };
  }

  return { limited: false, remaining, resetTime };
}

function getClientIdentifier(req: NextRequest): string {
  // Use IP address, fallback to user agent + some entropy
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : realIp
    ? realIp
    : "unknown";

  // Add some entropy to prevent simple IP-based attacks
  const userAgent = req.headers.get("user-agent") || "";
  return `${ip}-${userAgent.slice(0, 50)}`;
}

// Note: Cleanup is handled automatically by garbage collection in Edge Runtime
