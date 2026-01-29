/**
 * Simple in-memory cache for sector data.
 * In production, use Redis/Vercel KV for persistence across serverless instances.
 * 
 * This cache is warmed by the cron job every 1-2 hours.
 * Users get instant responses from cache.
 */

import { Redis } from '@upstash/redis';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache (works for single server, use Redis for production)
const cache = new Map<string, CacheEntry>();

// Cache TTL: 2 hours (cron runs every 1-2 hours, so data is always fresh)
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = Math.floor(CACHE_TTL_MS / 1000);

const WARMED_AT_KEY = 'sector:cache:warmed_at';

function getRedisClient(): Redis | null {
  // Upstash Redis REST env vars:
  // - UPSTASH_REDIS_REST_URL
  // - UPSTASH_REDIS_REST_TOKEN
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

// Track if background warming has been triggered (prevents multiple triggers)
let warmingTriggered = false;
let warmingInProgress = false;

export async function getCachedSectorData(sectorId: string): Promise<unknown | null> {
  const key = `sector:${sectorId}:overview`;

  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get<string>(key);
      if (!raw) {
        console.log(`[CACHE] ❌ MISS for sector ${sectorId}`);
        return null;
      }
      const data = JSON.parse(raw) as unknown;
      console.log(`[CACHE] ✅ HIT for sector ${sectorId} (redis)`);
      return data;
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

  // Check if expired
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

export async function setCachedSectorData(sectorId: string, data: unknown): Promise<void> {
  const key = `sector:${sectorId}:overview`;
  const now = Date.now();

  const redis = getRedisClient();
  if (redis) {
    try {
      // Store as a JSON string for deterministic behavior.
      await redis.set(key, JSON.stringify(data), { ex: CACHE_TTL_SECONDS });
      await redis.set(WARMED_AT_KEY, String(now), { ex: CACHE_TTL_SECONDS });
      console.log(`[CACHE] 💾 SET for sector ${sectorId} (redis)`);
      return;
    } catch (e) {
      console.error(`[CACHE] ❌ Redis write failed for sector ${sectorId}:`, e);
      // Fall back to in-memory for this request.
    }
  }

  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + CACHE_TTL_MS,
  });

  console.log(`[CACHE] 💾 SET for sector ${sectorId}`);
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

// Optional: Clear expired entries periodically
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

// Check if cache is empty (triggers background warming on first request)
export async function isCacheEmpty(): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const warmedAt = await redis.get<string>(WARMED_AT_KEY);
      return !warmedAt;
    } catch (e) {
      console.error('[CACHE] ❌ Redis warmed flag check failed:', e);
      // If Redis is misconfigured/unreachable, assume empty so app can still fetch live.
      return true;
    }
  }
  return cache.size === 0;
}

// Trigger background cache warming (called on first cache miss after deploy)
export function triggerBackgroundWarming(origin?: string): void {
  // Prevent multiple triggers
  if (warmingTriggered || warmingInProgress) {
    console.log('[CACHE] ⏭️ Background warming already triggered/in progress, skipping');
    return;
  }
  
  warmingTriggered = true;
  warmingInProgress = true;
  
  console.log('[CACHE] 🚀 Triggering standalone background cache warming...');
  
  // Build the URL for the cron endpoint
  const baseUrl =
    origin ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  
  if (!baseUrl) {
    console.log('[CACHE] ⚠️ No base URL configured, skipping background warming');
    warmingInProgress = false;
    warmingTriggered = false;
    return;
  }
  
  // Fire and forget - the cron endpoint handles everything standalone
  fetch(`${baseUrl}/api/cron/warm-sectors`, {
    method: 'GET',
  }).then((resp) => {
    console.log(`[CACHE] ✅ Background warming triggered (status: ${resp.status})`);
    warmingInProgress = false;
  }).catch((err) => {
    console.error('[CACHE] ❌ Background warming failed:', err);
    warmingInProgress = false;
    warmingTriggered = false; // Allow retry
  });
}

// Reset warming flag (useful for testing)
export function resetWarmingFlag(): void {
  warmingTriggered = false;
  warmingInProgress = false;
}
