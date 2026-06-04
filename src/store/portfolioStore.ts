import { create } from "zustand";
import { parseFollowedEntities } from "@/lib/portfolioEntity";
import { extractPortfolioList } from "@/lib/portfolioListUtils";
import { fetchUserListsFromXano } from "@/lib/userLists";
import { fetchUserPortfolioData, type PortfolioDataResult } from "@/lib/portfolioData";
import { FOLLOW_KEY_TO_ENTITY_TYPE } from "@/lib/portfolioFollow";

export type PortfolioFollowKey =
  | "followed_companies"
  | "followed_advisors"
  | "followed_investors"
  | "followed_sectors"
  | "followed_individuals";

/** Shape of a single portfolio record returned by Xano's get_users_lists. */
export interface XanoPortfolio {
  id: number;
  created_at: number;
  portfolio_label: string;
  user_id: number;
  /** Returned by get_users_lists — pre-computed count for the badge. */
  total_entities: number | null;
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
  return parseFollowedEntities(arr).map((e) => e.id);
}

/** Stable tab order: by id ascending — unaffected by renames. */
export function sortPortfoliosStable(items: XanoPortfolio[]): XanoPortfolio[] {
  return [...items].sort((a, b) => a.id - b.id);
}

/** User list tabs from get_users_lists (stable order). */
export function getNamedPortfolios(items: XanoPortfolio[]): XanoPortfolio[] {
  return sortPortfoliosStable(items.filter((p) => p.id > 0));
}

/** Display label for a list tab (fallback when portfolio_label is empty). */
export function getPortfolioDisplayLabel(p: XanoPortfolio): string {
  const label = p.portfolio_label.trim();
  if (label) return label;
  return `List ${p.id}`;
}

function portfolioHasEntities(p: XanoPortfolio): boolean {
  return (
    p.followed_companies.length +
    p.followed_advisors.length +
    p.followed_investors.length +
    p.followed_sectors.length +
    p.followed_individuals.length >
    0
  );
}

function normalizeXanoPortfolio(raw: Record<string, unknown>): XanoPortfolio {
  const idRaw = raw.id;
  const id =
    typeof idRaw === "number"
      ? idRaw
      : typeof idRaw === "string"
      ? Number.parseInt(idRaw, 10)
      : 0;

  const userIdRaw = raw.user_id;
  const userId =
    typeof userIdRaw === "number"
      ? userIdRaw
      : typeof userIdRaw === "string"
      ? Number.parseInt(userIdRaw, 10)
      : 0;

  const createdRaw = raw.created_at;
  const created_at =
    typeof createdRaw === "number"
      ? createdRaw
      : typeof createdRaw === "string"
      ? Number.parseInt(createdRaw, 10)
      : 0;

  return {
    id,
    created_at,
    portfolio_label:
      typeof raw.portfolio_label === "string"
        ? raw.portfolio_label
        : typeof raw.label === "string"
        ? raw.label
        : typeof raw.list_name === "string"
        ? raw.list_name
        : typeof raw.name === "string"
        ? raw.name
        : "",
    user_id: userId,
    total_entities:
      typeof raw.total_entities === "number" && Number.isFinite(raw.total_entities)
        ? raw.total_entities
        : null,
    followed_companies: normalizeIds(raw.followed_companies),
    followed_advisors: normalizeIds(raw.followed_advisors),
    followed_investors: normalizeIds(raw.followed_investors),
    followed_sectors: normalizeIds(raw.followed_sectors),
    followed_individuals: normalizeIds(raw.followed_individuals),
  };
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
  /** Merged follow state across all lists — legacy, kept for list entity checks. */
  data: PortfolioData | null;
  /** Full list of Xano lists (tabs). */
  portfolios: XanoPortfolio[];
  /** The user's singular portfolio (follow state). */
  userPortfolio: PortfolioDataResult | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchPortfolio: () => Promise<void>;
  setPortfolio: (raw: unknown) => void;
  setUserPortfolio: (data: PortfolioDataResult | null) => void;
  /** Update or insert one portfolio record (e.g. after PATCH rename). */
  upsertPortfolio: (raw: Record<string, unknown>) => void;
  isFollowed: (followKey: PortfolioFollowKey, entityId: number) => boolean;
  reset: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  data: null,
  portfolios: [],
  userPortfolio: null,
  loading: false,
  error: null,
  lastFetched: null,

  fetchPortfolio: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const token = localStorage.getItem("asymmetrix_auth_token");

    if (!token) {
      set({ data: null, portfolios: [], userPortfolio: null, loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      // Load lists (tabs) and portfolio follow state in parallel
      const [raw] = await Promise.all([
        fetchUserListsFromXano(),
        fetchUserPortfolioData()
          .then((pd) => { set({ userPortfolio: pd }); })
          .catch(() => { /* silently ignore portfolio data errors */ }),
      ]);
      get().setPortfolio(raw);
      set({ loading: false, error: null, lastFetched: Date.now() });
    } catch (e) {
      set({
        data: null,
        portfolios: [],
        loading: false,
        error: (e as Error).message ?? "Failed to fetch user lists",
      });
    }
  },

  setPortfolio: (raw) => {
    if (raw == null) {
      set({ data: emptyData, portfolios: [] });
      return;
    }

    const list = extractPortfolioList(raw);
    if (list) {
      const items = sortPortfoliosStable(
        list
          .filter((item) => item && typeof item === "object")
          .map((item) => normalizeXanoPortfolio(item as Record<string, unknown>))
      );
      set({ portfolios: items, data: mergePortfolios(items) });
      return;
    }

    // Single portfolio object — upsert into existing list
    if (typeof raw === "object") {
      get().upsertPortfolio(raw as Record<string, unknown>);
      return;
    }

    set({ data: emptyData, portfolios: [] });
  },

  setUserPortfolio: (data) => {
    set({ userPortfolio: data });
  },

  upsertPortfolio: (raw) => {
    const next = normalizeXanoPortfolio(raw);
    if (!next.id) return;

    const { portfolios } = get();
    const idx = portfolios.findIndex((p) => p.id === next.id);
    const merged =
      idx >= 0
        ? portfolios.map((p, i) => {
            if (i !== idx) return p;
            const keepFollowed = !portfolioHasEntities(next);
            return {
              ...p,
              portfolio_label: next.portfolio_label || p.portfolio_label,
              created_at: next.created_at || p.created_at,
              user_id: next.user_id || p.user_id,
              total_entities: next.total_entities ?? p.total_entities,
              followed_companies: keepFollowed
                ? p.followed_companies
                : next.followed_companies,
              followed_advisors: keepFollowed
                ? p.followed_advisors
                : next.followed_advisors,
              followed_investors: keepFollowed
                ? p.followed_investors
                : next.followed_investors,
              followed_sectors: keepFollowed
                ? p.followed_sectors
                : next.followed_sectors,
              followed_individuals: keepFollowed
                ? p.followed_individuals
                : next.followed_individuals,
            };
          })
        : [...portfolios, next];

    const sorted = sortPortfoliosStable(merged);
    set({ portfolios: sorted, data: mergePortfolios(sorted) });
  },

  isFollowed: (followKey, entityId) => {
    const { userPortfolio } = get();
    if (!userPortfolio) return false;
    const entityType = FOLLOW_KEY_TO_ENTITY_TYPE[followKey];
    return userPortfolio.items.some(
      (item) => item.entity === entityType && item.id === entityId
    );
  },

  reset: () =>
    set({ data: null, portfolios: [], userPortfolio: null, loading: false, error: null, lastFetched: null }),
}));
