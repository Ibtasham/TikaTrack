/**
 * Lightweight in-memory sliding-window rate limiter for API & WebSocket routes.
 * Pure TypeScript with automatic stale-entry eviction so memory stays bounded.
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private ops = 0;
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly maxKeys: number;

  constructor(options: { windowMs: number; maxRequests: number; maxKeys?: number }) {
    this.windowMs = Math.max(1000, options.windowMs);
    this.maxRequests = Math.max(1, options.maxRequests);
    this.maxKeys = Math.max(100, options.maxKeys ?? 5000);
  }

  check(key: string, nowMs = Date.now()): RateLimitDecision {
    const safeKey = (key || 'unknown').slice(0, 128);
    const cutoff = nowMs - this.windowMs;
    const prev = this.hits.get(safeKey);
    const recent = prev ? prev.filter((ts) => ts > cutoff) : [];

    this.ops += 1;
    if (this.ops % 200 === 0 || this.hits.size > this.maxKeys) {
      this.prune(cutoff);
    }

    if (recent.length >= this.maxRequests) {
      this.hits.set(safeKey, recent);
      const oldest = recent[0] ?? nowMs;
      const retryMs = Math.max(1000, oldest + this.windowMs - nowMs);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryMs / 1000),
      };
    }

    recent.push(nowMs);
    this.hits.set(safeKey, recent);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - recent.length),
      retryAfterSeconds: 0,
    };
  }

  prune(cutoffMs = Date.now() - this.windowMs): void {
    for (const [key, timestamps] of this.hits.entries()) {
      const kept = timestamps.filter((ts) => ts > cutoffMs);
      if (kept.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, kept);
      }
    }
    if (this.hits.size > this.maxKeys) {
      const excess = this.hits.size - this.maxKeys;
      let removed = 0;
      for (const key of this.hits.keys()) {
        this.hits.delete(key);
        removed += 1;
        if (removed >= excess) break;
      }
    }
  }
}

export function extractClientIp(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress?: string,
): string {
  const forwarded = headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',')[0].trim();
  }
  return remoteAddress || 'unknown';
}
