import { redis } from "./redis";

export async function enforceRateLimit(key: string, cooldownSec: number): Promise<boolean> {
  const existing = await redis.get(key);
  if (existing) return false;
  await redis.set(key, "1", "EX", cooldownSec);
  return true;
}
