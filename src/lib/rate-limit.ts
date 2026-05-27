import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${limit}:${windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    const seconds = Math.max(1, Math.round(windowMs / 1000));
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${seconds} s`),
      prefix: "routebook/rl",
      analytics: true,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export async function rateLimit(
  ip: string,
  { limit = 20, windowMs = 60000 }: { limit?: number; windowMs?: number } = {}
): Promise<{ success: boolean; remaining: number }> {
  const limiter = getLimiter(limit, windowMs);
  // Upstash 미설정 또는 장애 시 fail-open (요청 통과)
  if (!limiter) return { success: true, remaining: limit };

  try {
    const { success, remaining } = await limiter.limit(ip);
    return { success, remaining };
  } catch {
    return { success: true, remaining: limit };
  }
}
