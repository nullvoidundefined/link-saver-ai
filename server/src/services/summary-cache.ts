import { getRedis } from 'app/config/redis.js';
import { logger } from 'app/utils/logs/logger.js';

const SUMMARY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function cacheKey(urlHash: string): string {
  return `summary:${urlHash}`;
}

export async function getCachedSummary(
  urlHash: string,
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return await redis.get(cacheKey(urlHash));
  } catch (err) {
    logger.error({ err }, 'Failed to read summary from cache');
    return null;
  }
}

export async function cacheSummary(
  urlHash: string,
  summary: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(cacheKey(urlHash), summary, 'EX', SUMMARY_TTL_SECONDS);
  } catch (err) {
    logger.error({ err }, 'Failed to write summary to cache');
  }
}

export async function bustSummaryCache(urlHash: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(cacheKey(urlHash));
  } catch (err) {
    logger.error({ err }, 'Failed to bust summary cache');
  }
}
