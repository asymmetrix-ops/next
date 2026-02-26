import { create } from "zustand";

export type PortfolioFollowKey =
  | "followed_companies"
  | "followed_advisors"
  | "followed_investors"
  | "followed_sectors"
  | "followed_individuals";

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

interface PortfolioState {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchPortfolio: () => Promise<void>;
  setPortfolio: (raw: Record<string, unknown> | null) => void;
  isFollowed: (followKey: PortfolioFollowKey, entityId: number) => boolean;
  reset: () => void;
}

const emptyData: PortfolioData = {
  followed_companies: [],
  followed_advisors: [],
  followed_investors: [],
  followed_sectors: [],
  followed_individuals: [],
};

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: null,

  fetchPortfolio: async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;

    if (!token) {
      set({ data: null, loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/portfolio", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;

      if (!res.ok) {
        set({
          data: null,
          loading: false,
          error: (raw as { error?: string })?.error ?? "Failed to fetch portfolio",
        });
        return;
      }

      get().setPortfolio(raw);
      set({ loading: false, error: null, lastFetched: Date.now() });
    } catch (e) {
      set({
        data: null,
        loading: false,
        error: (e as Error).message ?? "Failed to fetch portfolio",
      });
    }
  },

  setPortfolio: (raw) => {
    if (!raw || typeof raw !== "object") {
      set({ data: emptyData });
      return;
    }

    set({
      data: {
        followed_companies: normalizeIds(raw.followed_companies),
        followed_advisors: normalizeIds(raw.followed_advisors),
        followed_investors: normalizeIds(raw.followed_investors),
        followed_sectors: normalizeIds(raw.followed_sectors),
        followed_individuals: normalizeIds(raw.followed_individuals),
      },
    });
  },

  isFollowed: (followKey, entityId) => {
    const { data } = get();
    if (!data) return false;
    const ids = data[followKey];
    return Array.isArray(ids) && ids.includes(entityId);
  },

  reset: () => set({ data: null, loading: false, error: null, lastFetched: null }),
}));
