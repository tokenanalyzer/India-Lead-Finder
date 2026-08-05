import type { Request, Response, NextFunction } from "express";

// ─── Simple in-memory per-IP rate limiter ────────────────────────────────────
// Protects the Google Places proxy from being hammered by unauthenticated
// callers and draining the server's Google Maps billing quota. Good enough
// for a single-instance, single-user deployment — no external store needed.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 30;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the map doesn't grow forever.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, WINDOW_MS);
cleanupTimer.unref();

export function placesRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: "Too many search requests. Please wait a few minutes and try again.",
    });
    return;
  }

  bucket.count += 1;
  next();
}
