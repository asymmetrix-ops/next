/**
 * Simple in-memory cache for sector data.
 * In production, use Redis/Vercel KV for persistence across serverless instances.
 * 
 * This cache is warmed by the cron job every 1-2 hours.
 * Users get instant responses from cache.
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache (works for single server, use Redis for production)
const cache = new Map<string, CacheEntry>();

// Cache TTL: 2 hours (cron runs every 1-2 hours, so data is always fresh)
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

// Track if background warming has been triggered (prevents multiple triggers)
let warmingTriggered = false;
let warmingInProgress = false;

export function getCachedSectorData(sectorId: string): unknown | null {
  const key = `sector:${sectorId}:overview`;
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
  
  console.log(`[CACHE] ✅ HIT for sector ${sectorId} (age: ${Math.round((Date.now() - entry.timestamp) / 1000)}s)`);
  return entry.data;
}

export function setCachedSectorData(sectorId: string, data: unknown): void {
  const key = `sector:${sectorId}:overview`;
  const now = Date.now();
  
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
export function isCacheEmpty(): boolean {
  return cache.size === 0;
}

// Trigger background cache warming (called on first cache miss after deploy)
export function triggerBackgroundWarming(): void {
  // Prevent multiple triggers
  if (warmingTriggered || warmingInProgress) {
    console.log('[CACHE] ⏭️ Background warming already triggered/in progress, skipping');
    return;
  }
  
  warmingTriggered = true;
  warmingInProgress = true;
  
  console.log('[CACHE] 🚀 Triggering standalone background cache warming...');
  
  // Build the URL for the cron endpoint
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  
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
