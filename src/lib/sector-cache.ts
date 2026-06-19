/**
 * Read-through cache for sector data stored in Redis (Upstash).
 * Populated by an external cache engine; this app only reads and invalidates.
 */

import { Redis } from '@upstash/redis';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

// In-memory fallback when Redis is not configured (local dev).
const cache = new Map<string, CacheEntry>();

const SECTOR_LIST_KEY = 'sectors:list:v1';

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

export async function getCachedSectorData(sectorId: string): Promise<unknown | null> {
  const key = `sector:${sectorId}:overview`;

  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get<unknown>(key);
      if (raw == null) {
        console.log(`[CACHE] ❌ MISS for sector ${sectorId}`);
        return null;
      }
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw) as unknown;
          console.log(`[CACHE] ✅ HIT for sector ${sectorId} (redis:string)`);
          return parsed;
        } catch {
          console.error(`[CACHE] ❌ Redis value is not JSON for sector ${sectorId}`);
          return null;
        }
      }

      console.log(`[CACHE] ✅ HIT for sector ${sectorId} (redis)`);
      return raw;
    } catch (e) {
      console.error(`[CACHE] ❌ Redis read/parse failed for sector ${sectorId}:`, e);
      return null;
    }
  }

  const entry = cache.get(key);
  if (!entry) {
    console.log(`[CACHE] ❌ MISS for sector ${sectorId}`);
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    console.log(`[CACHE] ⏰ EXPIRED for sector ${sectorId}`);
    cache.delete(key);
    return null;
  }

  console.log(
    `[CACHE] ✅ HIT for sector ${sectorId} (age: ${Math.round((Date.now() - entry.timestamp) / 1000)}s)`
  );
  return entry.data;
}

export async function getCachedSectorsList(): Promise<unknown | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get<unknown>(SECTOR_LIST_KEY);
      if (raw == null) return null;
      return raw;
    } catch (e) {
      console.error('[CACHE] ❌ Redis read failed for sector list:', e);
      return null;
    }
  }

  const entry = cache.get(SECTOR_LIST_KEY);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(SECTOR_LIST_KEY);
    return null;
  }
  return entry.data;
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let cleaned = 0;

  Array.from(cache.entries()).forEach(([key, entry]) => {
    if (now > entry.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  });

  return cleaned;
}

export async function invalidateCachedSectorData(sectorId: string): Promise<void> {
  const key = `sector:${sectorId}:overview`;
  const redis = getRedisClient();
  if (redis) {
    await redis.del(key);
  } else {
    cache.delete(key);
  }
}

export async function invalidateCachedSectorsList(): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.del(SECTOR_LIST_KEY);
  } else {
    cache.delete(SECTOR_LIST_KEY);
  }
}
