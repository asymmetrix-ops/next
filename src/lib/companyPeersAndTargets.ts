import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";

export type PeerTargetItem = {
  /** null/undefined when the company is not in the database */
  company_id?: number | null;
  name: string;
  logo?: string | null;
  country?: string | null;
  country_iso2?: string | null;
  sector?: string | null;
  /** Id of the sector/sub-sector, used to build the link to /sector/[id] or /sub-sector/[id] */
  sector_id?: number | null;
  /** "Primary" -> links to /sector/[id]; anything else (e.g. "Secondary") -> links to /sub-sector/[id] */
  sector_importance?: string | null;
  ownership?: string | null;
  revenue_band?: string | null;
  revenue_usd_m?: number | string | null;
};

export type PeersAndTargetsResponse = {
  company_id: number;
  peers: {
    count: number;
    benchmark_company_ids: number[];
    items: PeerTargetItem[];
  };
  acquisition_targets: {
    count: number;
    items: PeerTargetItem[];
  };
};

const BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop";

export async function fetchCompanyPeersAndTargets(
  companyId: number,
  signal?: AbortSignal
): Promise<PeersAndTargetsResponse | null> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;
  const res = await fetch(
    `${BASE}/company_peers_and_targets?company_id=${encodeURIComponent(companyId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal,
    }
  );
  if (!res.ok) return null;
  return (await res.json()) as PeersAndTargetsResponse;
}

/** Lower index = larger revenue. Unknown bands sort last. */
const BAND_ORDER = ["$500m+", "$250-500m", "$100-250m", "$50-100m", "$10-50m"];

export function revenueBandRank(band?: string | null): number {
  const norm = (band ?? "").replace(/\s/g, "").replace(/[–—]/g, "-").toLowerCase();
  const i = BAND_ORDER.findIndex((b) => b.toLowerCase() === norm);
  return i === -1 ? BAND_ORDER.length : i;
}

function peerRevenueUsdM(item: PeerTargetItem): number | null {
  if (item.revenue_usd_m == null || item.revenue_usd_m === "") return null;
  const n = Number(item.revenue_usd_m);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Revenue figure when sent, else the band
export function formatPeerRevenue(item: PeerTargetItem): string {
  const n = peerRevenueUsdM(item);
  if (n != null) return `$${formatMetricMillionsPlain(n)}m`;
  return item.revenue_band?.trim() || "";
}

// Largest revenue first, figures before bands, unknown last
export function sortByRevenueDesc(items: PeerTargetItem[]): PeerTargetItem[] {
  return items
    .map((it, i) => ({ it, i, n: peerRevenueUsdM(it) }))
    .sort((a, b) => {
      if (a.n != null && b.n != null) return b.n - a.n || a.i - b.i;
      if (a.n != null) return -1;
      if (b.n != null) return 1;
      return revenueBandRank(a.it.revenue_band) - revenueBandRank(b.it.revenue_band) || a.i - b.i;
    })
    .map((x) => x.it);
}
