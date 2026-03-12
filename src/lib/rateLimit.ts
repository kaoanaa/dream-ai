type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(args: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(args.key);

  if (!existing || existing.resetAtMs <= now) {
    buckets.set(args.key, { count: 1, resetAtMs: now + args.windowMs });
    return { ok: true };
  }

  if (existing.count >= args.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}

