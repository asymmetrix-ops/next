/**
 * FX Rate Service
 * 
 * Fetches and caches exchange rates for USD → GBP and USD → EUR.
 * Uses a free API (exchangerate.host or similar) with 12-24h TTL caching.
 * All data in the app is stored in USD; conversion happens client-side.
 */

export type Currency = "USD" | "GBP" | "EUR";

export interface FXRates {
  USD: number; // Always 1
  GBP: number; // USD → GBP rate
  EUR: number; // USD → EUR rate
  lastUpdated: number; // Timestamp
}

const CACHE_KEY = "asymmetrix_fx_rates";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Default fallback rates (approximate) in case API fails
const FALLBACK_RATES: FXRates = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  lastUpdated: 0,
};

/**
 * Get cached rates from localStorage
 */
function getCachedRates(): FXRates | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const rates: FXRates = JSON.parse(cached);
    // Check if cache is still valid
    if (Date.now() - rates.lastUpdated < CACHE_TTL_MS) {
      return rates;
    }
    return null; // Cache expired
  } catch {
    return null;
  }
}

/**
 * Store rates in localStorage
 */
function setCachedRates(rates: FXRates): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch fresh FX rates from API
 * Uses exchangerate.host (free, no API key required)
 */
async function fetchFreshRates(): Promise<FXRates> {
  try {
    // Primary: exchangerate.host (free, no key needed)
    const response = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=GBP,EUR",
      { next: { revalidate: 43200 } } // 12h cache for Next.js
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.success !== false && data.rates) {
        return {
          USD: 1,
          GBP: data.rates.GBP ?? FALLBACK_RATES.GBP,
          EUR: data.rates.EUR ?? FALLBACK_RATES.EUR,
          lastUpdated: Date.now(),
        };
      }
    }

    // Fallback: frankfurter.app (also free, no key)
    const fallbackResponse = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=GBP,EUR"
    );
    
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      if (fallbackData.rates) {
        return {
          USD: 1,
          GBP: fallbackData.rates.GBP ?? FALLBACK_RATES.GBP,
          EUR: fallbackData.rates.EUR ?? FALLBACK_RATES.EUR,
          lastUpdated: Date.now(),
        };
      }
    }

    throw new Error("Both FX APIs failed");
  } catch (error) {
    console.warn("[FXRates] Failed to fetch rates, using fallback:", error);
    return { ...FALLBACK_RATES, lastUpdated: Date.now() };
  }
}

/**
 * Get current FX rates (cached or fresh)
 */
export async function getFXRates(): Promise<FXRates> {
  // Check cache first
  const cached = getCachedRates();
  if (cached) {
    return cached;
  }

  // Fetch fresh rates
  const fresh = await fetchFreshRates();
  setCachedRates(fresh);
  return fresh;
}

/**
 * Convert a USD value to the target currency
 * @param usdValue - Value in USD
 * @param targetCurrency - Target currency code
 * @param rates - FX rates object
 * @returns Converted value
 */
export function convertCurrency(
  usdValue: number | null,
  targetCurrency: Currency,
  rates: FXRates
): number | null {
  if (usdValue === null) return null;
  if (targetCurrency === "USD") return usdValue;
  return usdValue * rates[targetCurrency];
}

/**
 * Format a monetary value with the correct currency symbol and locale
 * @param value - Numeric value (already converted to target currency)
 * @param currency - Currency code for formatting
 */
export function formatCurrency(
  value: number | null,
  currency: Currency
): string {
  if (value === null) return "—";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  // Format the value
  let formatted = formatter.format(value);
  
  // Remove trailing .0 if present
  formatted = formatted.replace(/\.0(?=\s|$)/, "");

  return formatted;
}

/**
 * Currency display info for UI
 */
export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
];

