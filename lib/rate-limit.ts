/**
 * In-memory rate limiter for sensitive API endpoints.
 *
 * IMPORTANT LIMITATIONS:
 * - This is a DEVELOPMENT-SAFE, single-instance, in-memory rate limiter.
 * - It does NOT work across multiple server instances or serverless functions.
 * - For production distributed rate limiting, use an external solution
 *   (e.g., Redis with ioredis, Upstash, or a WAF-level rate limiter).
 * - This provides basic protection against naive brute-force attacks in
 *   single-server or local development environments only.
 */

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const store = new Map<string, RateLimitRecord>();

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Block duration in milliseconds after limit exceeded */
  blockDurationMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,        // 1 minute
  blockDurationMs: 300_000 // 5 minutes
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * Check if a given key (e.g. IP + endpoint) is rate-limited.
 * Returns { allowed, remaining, retryAfterMs }.
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  // Clean up very old records periodically (basic GC)
  if (store.size > 10_000) {
    for (const [k, v] of store.entries()) {
      if (now - v.firstAttempt > cfg.windowMs * 10) {
        store.delete(k);
      }
    }
  }

  const record = store.get(key);

  if (record) {
    // Check if still blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: record.blockedUntil - now,
      };
    }

    // Reset window if expired
    if (now - record.firstAttempt > cfg.windowMs) {
      store.set(key, { count: 1, firstAttempt: now });
      return { allowed: true, remaining: cfg.maxRequests - 1 };
    }

    // Increment
    record.count++;

    if (record.count > cfg.maxRequests) {
      record.blockedUntil = now + cfg.blockDurationMs;
      store.set(key, record);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: cfg.blockDurationMs,
      };
    }

    store.set(key, record);
    return { allowed: true, remaining: cfg.maxRequests - record.count };
  }

  // First attempt
  store.set(key, { count: 1, firstAttempt: now });
  return { allowed: true, remaining: cfg.maxRequests - 1 };
}

/**
 * Get IP from request headers (best-effort for Next.js).
 * Returns "unknown" if not determinable.
 */
export function getRequestIp(request: Request): string {
  const headers = request.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "unknown";
}
