import { create } from "zustand";

export type PortfolioFollowKey =
  | "followed_companies"
  | "followed_advisors"
  | "followed_investors"
  | "followed_sectors"
  | "followed_individuals";

/** Shape of a single portfolio record returned by Xano's get_users_portfolio. */
export interface XanoPortfolio {
  id: number;
  created_at: number;
  portfolio_label: string;
  user_id: number;
  followed_companies: number[];
  followed_sectors: number[];
  followed_individuals: number[];
  followed_investors: number[];
  followed_advisors: number[];
}

export interface PortfolioData {
  followed_companies: number[];
  followed_advisors: number[];
  followed_investors: number[];
  followed_sectors: number[];
  followed_individuals: number[];
}

function normalizeIds(arr: unknown): number[] {
  const items = Array.isArray(arr) ? arr : arr != null ? [arr] : [];
  return items
    .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0)
    .map((v) => v as number);
}

/** Merge followed_* arrays from all portfolios into one deduplicated set. */
function mergePortfolios(items: XanoPortfolio[]): PortfolioData {
  const companies = new Set<number>();
  const advisors = new Set<number>();
  const investors = new Set<number>();
  const sectors = new Set<number>();
  const individuals = new Set<number>();

  for (const p of items) {
    normalizeIds(p.followed_companies).forEach((id) => companies.add(id));
    normalizeIds(p.followed_advisors).forEach((id) => advisors.add(id));
    normalizeIds(p.followed_investors).forEach((id) => investors.add(id));
    normalizeIds(p.followed_sectors).forEach((id) => sectors.add(id));
    normalizeIds(p.followed_individuals).forEach((id) => individuals.add(id));
  }

  return {
    followed_companies: Array.from(companies),
    followed_advisors: Array.from(advisors),
    followed_investors: Array.from(investors),
    followed_sectors: Array.from(sectors),
    followed_individuals: Array.from(individuals),
  };
}

const emptyData: PortfolioData = {
  followed_companies: [],
  followed_advisors: [],
  followed_investors: [],
  followed_sectors: [],
  followed_individuals: [],
};

interface PortfolioState {
  /** Merged follow state across all portfolios — used by isFollowed(). */
  data: PortfolioData | null;
  /** Full list of Xano portfolios (tabs). */
  portfolios: XanoPortfolio[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchPortfolio: () => Promise<void>;
  setPortfolio: (raw: unknown) => void;
  isFollowed: (followKey: PortfolioFollowKey, entityId: number) => boolean;
  reset: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  data: null,
  portfolios: [],
  loading: false,
  error: null,
  lastFetched: null,

  fetchPortfolio: async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;

    if (!token) {
      set({ data: null, portfolios: [], loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/portfolio", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-asym-token": token,
        },
        credentials: "include",
      });

      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        const errMsg =
          raw && typeof raw === "object" && "error" in raw
            ? String((raw as { error: unknown }).error)
            : "Failed to fetch portfolio";
        set({ data: null, portfolios: [], loading: false, error: errMsg });
        return;
      }

      get().setPortfolio(raw);
      set({ loading: false, error: null, lastFetched: Date.now() });
    } catch (e) {
      set({
        data: null,
        portfolios: [],
        loading: false,
        error: (e as Error).message ?? "Failed to fetch portfolio",
      });
    }
  },

  setPortfolio: (raw) => {
    if (raw == null) {
      set({ data: emptyData, portfolios: [] });
      return;
    }

    // Array of portfolios — new format from get_users_portfolio
    if (Array.isArray(raw)) {
      const items = raw as XanoPortfolio[];
      set({ portfolios: items, data: mergePortfolios(items) });
      return;
    }

    // Single portfolio object — legacy fallback
    if (typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      set({
        portfolios: [],
        data: {
          followed_companies: normalizeIds(r.followed_companies),
          followed_advisors: normalizeIds(r.followed_advisors),
          followed_investors: normalizeIds(r.followed_investors),
          followed_sectors: normalizeIds(r.followed_sectors),
          followed_individuals: normalizeIds(r.followed_individuals),
        },
      });
      return;
    }

    set({ data: emptyData, portfolios: [] });
  },

  isFollowed: (followKey, entityId) => {
    const { data } = get();
    if (!data) return false;
    const ids = data[followKey];
    return Array.isArray(ids) && ids.includes(entityId);
  },

  reset: () =>
    set({ data: null, portfolios: [], loading: false, error: null, lastFetched: null }),
}));
