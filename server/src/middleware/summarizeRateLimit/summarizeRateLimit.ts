import { getRedis } from 'app/config/redis.js';
import { logger } from 'app/utils/logs/logger.js';
import type { NextFunction, Request, Response } from 'express';

const MAX_SUMMARIES_PER_HOUR = 20;
const WINDOW_SECONDS = 3600;

function rateLimitKey(userId: string): string {
  return `ratelimit:summary:${userId}`;
}

export async function summarizeRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    // If Redis is unavailable, allow the request through
    next();
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    next();
    return;
  }

  const key = rateLimitKey(userId);

  try {
    const current = await redis.incr(key);

    // Set expiry on first request in the window
    if (current === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    res.setHeader('X-RateLimit-Limit', MAX_SUMMARIES_PER_HOUR);
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, MAX_SUMMARIES_PER_HOUR - current),
    );

    if (current > MAX_SUMMARIES_PER_HOUR) {
      const ttl = await redis.ttl(key);
      res.setHeader('Retry-After', ttl > 0 ? ttl : WINDOW_SECONDS);
      res.status(429).json({
        error: {
          message: 'Too many summary requests. Please try again later.',
        },
      });
      return;
    }

    next();
  } catch (err) {
    logger.error({ err }, 'Summary rate limit check failed');
    // Fail open — allow the request if Redis errors
    next();
  }
}
