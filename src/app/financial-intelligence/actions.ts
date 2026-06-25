"use server";

import { cookies } from "next/headers";
import type { FiLocationRow } from "@/lib/financialIntelligence/types";

const LOCATIONS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop";

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("asymmetrix_auth_token")?.value;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export async function fetchFiLocationsServer(): Promise<FiLocationRow[]> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return [];

    const candidatePaths = [
      "get_all_locations",
      "Get_All_Locations",
      "locations_all",
      "locations",
    ];

    for (const path of candidatePaths) {
      try {
        const response = await fetch(`${LOCATIONS_API_BASE}/${path}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        if (!response.ok) continue;

        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : [];
        const mapped: FiLocationRow[] = [];
        for (const row of rows) {
          const obj = row as Record<string, unknown>;
          const id = Number(obj.id ?? obj.locations_id ?? 0);
          if (!Number.isFinite(id) || id <= 0) continue;
          mapped.push({
            id,
            Country: String(obj.Country ?? obj.locations_Country ?? obj.country ?? ""),
            Continental_Region: String(
              obj.Continental_Region ??
                obj.Locations_Continental_Region1 ??
                obj.continental_region ??
                ""
            ),
          });
        }

        if (mapped.length > 0) return mapped;
      } catch {
        // try next endpoint
      }
    }

    return [];
  } catch {
    return [];
  }
}
