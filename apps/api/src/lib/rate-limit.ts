import { redis, hasRedis } from "./redis";

/**
 * One-shot cooldown: returns false if key is already set (i.e. too-soon).
 * Used for pairing code generation — 1 attempt per cooldown window.
 */
export async function enforceRateLimit(key: string, cooldownSec: number): Promise<boolean> {
  const existing = await redis.get(key);
  if (existing) return false;
  await redis.set(key, "1", "EX", cooldownSec);
  return true;
}

/**
 * Counting rate limiter: allows up to `max` requests in `windowSec` seconds.
 * Falls back to allow-all when Redis is unavailable.
 * Returns true if the request is within the limit.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<boolean> {
  if (!hasRedis) return true;

  const redisKey = `rl:${key}`;
  const count = await (redis as any).eval(
    `local c = redis.call("INCR", KEYS[1])
     if c == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
     return c`,
    1,
    redisKey,
    String(windowSec)
  ) as number;

  return count <= max;
}

