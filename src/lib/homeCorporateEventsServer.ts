import { cookies } from "next/headers";
import {
  applyHqCountryIso2ToCorporateEvents,
  collectMissingHqCountryIso2CompanyIdsFromCorporateEvents,
  readHqCountryIso2,
} from "@/lib/dealRadar";
import { fetchCompanyTableDataByIds } from "@/lib/companyTableData";

const XANO_HOME_CORPORATE_EVENTS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/corporate_events";

export function parseHomeCorporateEventsResponse(
  responseValue: unknown
): Record<string, unknown>[] {
  if (Array.isArray(responseValue)) {
    return responseValue as Record<string, unknown>[];
  }

  if (!responseValue || typeof responseValue !== "object") {
    return [];
  }

  const record = responseValue as Record<string, unknown>;
  if (Array.isArray(record.CorporateEvents)) {
    return record.CorporateEvents as Record<string, unknown>[];
  }
  if (Array.isArray(record.data)) {
    return record.data as Record<string, unknown>[];
  }

  return [];
}

export async function fetchHomeCorporateEventsRaw(params: {
  token: string;
  showFollowed?: boolean;
  userId?: number | null;
}): Promise<unknown> {
  const url = new URL(XANO_HOME_CORPORATE_EVENTS_URL);
  url.searchParams.set("show_followed", String(Boolean(params.showFollowed)));

  if (
    params.showFollowed &&
    typeof params.userId === "number" &&
    Number.isFinite(params.userId)
  ) {
    url.searchParams.set("user_id", String(params.userId));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Data-Source": "live",
      Authorization: `Bearer ${params.token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Home corporate events API failed: ${response.status}`);
  }

  return response.json();
}

async function enrichCorporateEvents(
  events: Record<string, unknown>[],
  token: string
): Promise<Record<string, unknown>[]> {
  const missingCompanyIds =
    collectMissingHqCountryIso2CompanyIdsFromCorporateEvents(events);
  if (missingCompanyIds.length === 0) return events;

  try {
    const rows = await fetchCompanyTableDataByIds(missingCompanyIds, token);
    const isoByCompanyId = new Map<number, string | null>(
      Array.from(rows.entries()).map(([companyId, row]) => [
        companyId,
        readHqCountryIso2(row),
      ])
    );
    return applyHqCountryIso2ToCorporateEvents(events, isoByCompanyId);
  } catch (error) {
    console.error("Error enriching corporate event country flags:", error);
    return events;
  }
}

export async function fetchHomeCorporateEventsServer(params?: {
  token?: string | null;
  showFollowed?: boolean;
  userId?: number | null;
}): Promise<Record<string, unknown>[] | null> {
  const token =
    params?.token ?? cookies().get("asymmetrix_auth_token")?.value ?? null;
  if (!token) return null;

  const raw = await fetchHomeCorporateEventsRaw({
    token,
    showFollowed: params?.showFollowed,
    userId: params?.userId,
  });
  const events = parseHomeCorporateEventsResponse(raw);
  return enrichCorporateEvents(events, token);
}
