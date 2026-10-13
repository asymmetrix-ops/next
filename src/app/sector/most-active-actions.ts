"use server";

import { cookies } from "next/headers";
import { ADVISORS_API_BASE } from "@/lib/advisorsApiBase";

const SECTOR_API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV";

export type SectorMostActiveRankedKind = "strategics" | "pe" | "venture";

const RANKED_ENDPOINTS: Record<SectorMostActiveRankedKind, string> = {
  strategics: "sectors_strategic_acquirers",
  pe: "sectors_pe_investors",
  venture: "sectors_vc_investors",
};

async function authedGet(url: string): Promise<unknown | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!resp.ok) {
      console.error(`Sector most active API failed (${resp.status}): ${url}`);
      return null;
    }
    return await resp.json();
  } catch (error) {
    console.error("Sector most active API error:", error);
    return null;
  }
}

export async function fetchSectorMostActiveRankedServer(
  kind: SectorMostActiveRankedKind,
  sectorId: number,
  page: number
): Promise<unknown | null> {
  const qs = new URLSearchParams();
  qs.set("Sector_id", String(sectorId));
  qs.set("limit", "25");
  qs.set("offset", String((Math.max(1, page) - 1) * 25));
  return authedGet(`${SECTOR_API_BASE}/${RANKED_ENDPOINTS[kind]}?${qs.toString()}`);
}

export async function fetchSectorMostActiveAdvisorsServer(
  queryString: string
): Promise<unknown | null> {
  return authedGet(`${ADVISORS_API_BASE}/get_all_advisors_list?${queryString}`);
}
