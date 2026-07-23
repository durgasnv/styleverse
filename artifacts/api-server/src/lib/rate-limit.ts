import type { NextFunction, Request, RequestHandler, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

// No auth exists on API routes yet, so this is the only thing standing
// between an unauthenticated caller and unlimited paid try-on requests.
// In-memory and per-process — fine for a single-instance hackathon deploy,
// not a substitute for real auth/rate-limiting at scale.
export function createRateLimiter({ windowMs, max }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, number[]>();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= max) {
      const retryAfterMs = recent[0] + windowMs - now;
      res.setHeader("Retry-After", Math.ceil(retryAfterMs / 1000).toString());
      res.status(429).json({ error: "Too many try-on requests — please wait a moment before trying again." });
      return;
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
