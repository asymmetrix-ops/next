import { useEffect, useState } from "react";

const API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn:develop";

export type KeyPerson = {
  individual_id: number;
  name: string;
  deal_count: number;
  most_recent_deal_date: string | null;
  job_titles: string | null;
  total: number;
};

const cache = new Map<string, Promise<KeyPerson[]>>();

/** Deal-level key people for an advisor firm (individuals who worked on ≥1 deal). */
export function fetchAdvisorKeyPeople(
  advisorId: number,
  perPage = 200
): Promise<KeyPerson[]> {
  const key = `${advisorId}:${perPage}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = fetch(
      `${API_BASE}/advisor/key_people?company_id=${advisorId}&page=1&per_page=${perPage}`
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => (Array.isArray(d) ? (d as KeyPerson[]) : []))
      .catch(() => []);
    cache.set(key, hit);
  }
  return hit;
}

/** individual_id → number of deals advised, for the advisor profile People card. */
export function useAdvisorDealCounts(advisorId: number): Record<number, number> {
  const [counts, setCounts] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!advisorId || advisorId <= 0) return;
    let cancelled = false;
    fetchAdvisorKeyPeople(advisorId).then((rows) => {
      if (cancelled) return;
      const next: Record<number, number> = {};
      for (const r of rows) next[r.individual_id] = r.deal_count;
      setCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [advisorId]);
  return counts;
}
