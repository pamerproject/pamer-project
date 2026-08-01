import { kv } from "@vercel/kv";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MEMORY_STORE = new Map<string, RateLimitEntry>();

const DEFAULTS = {
  max: 5,
  windowMs: 60 * 1000,
};

const isKvAvailable = !!process.env.KV_REST_API_URL;

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export async function checkRateLimit(
  key: string,
  options: Partial<RateLimitOptions> = {}
): Promise<RateLimitResult> {
  const { max, windowMs } = { ...DEFAULTS, ...options };
  const now = Date.now();

  if (isKvAvailable) {
    return checkRateLimitKv(key, max, windowMs, now);
  }

  return checkRateLimitMemory(key, max, windowMs, now);
}

async function checkRateLimitKv(
  key: string,
  max: number,
  windowMs: number,
  now: number
): Promise<RateLimitResult> {
  const kvKey = `rl:${key}`;
  const windowSec = Math.ceil(windowMs / 1000);

  const current = await kv.get<number>(kvKey);
  const count = (current ?? 0) + 1;

  if (count === 1) {
    await kv.set(kvKey, count, { ex: windowSec });
  } else {
    await kv.incr(kvKey);
  }

  const ttl = await kv.ttl(kvKey);
  const resetAt = now + (ttl > 0 ? ttl * 1000 : windowMs);

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt,
  };
}

function checkRateLimitMemory(
  key: string,
  max: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const entry = MEMORY_STORE.get(key);

  if (!entry || now > entry.resetAt) {
    MEMORY_STORE.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

export function getRateLimitKey(req: Request, suffix: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${ip}:${suffix}`;
}
