"use server";

import { cookies } from "next/headers";
import type { Individual } from "@/types/individuals";
import {
  createDefaultIndividualFilters,
  individualsCountsFiltersToSearchParams,
  individualsFiltersToRequestBody,
  type IndividualsSearchFilters,
} from "@/lib/individualsFilterPayload";
import {
  mapResponseToIndividualsSummaryCounts,
  mapIndividualsCountsResponse,
} from "@/components/individuals/individualsFilterConfig";

export type { IndividualsSearchFilters };

export interface IndividualsListResponse {
  items: Individual[];
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  perPage: number;
  pageTotal: number;
  itemsTotal: number;
  summaryCounts: ReturnType<typeof mapResponseToIndividualsSummaryCounts>;
}

type IndividualsApiListResponse = {
  items?: unknown[];
  individuals?: unknown[];
  offset?: number;
  currentPage?: number;
  perPage?: number;
  totalItems?: number;
  totalIndividuals?: number;
  totalPages?: number;
  nextOffset?: number | null;
  currentRoles?: number;
  pastRoles?: number;
  ceos?: number;
  chairs?: number;
  founders?: number;
};

/**
 * Xano returns several fields as serialised JSON strings rather than parsed
 * objects / arrays.  This helper safely parses them; if the value is already
 * an object/array it is returned as-is.
 */
function parseJsonStringField<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "null") return null;
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeIndividualRole(raw: Record<string, unknown>) {
  const employeeNewCompanyId = Number(raw.employee_new_company_id);
  const companyName = String(raw.company_name ?? "").trim();
  const roleId = Number(raw.role_id ?? raw.id ?? 0);

  return {
    id: Number.isFinite(roleId) ? roleId : 0,
    individuals_id: Number(raw.individuals_id ?? 0),
    employee_new_company_id: Number.isFinite(employeeNewCompanyId)
      ? employeeNewCompanyId
      : 0,
    current_employer_url: String(
      raw.current_employer_url ?? raw.company_url ?? ""
    ),
    Status: String(raw.Status ?? ""),
    job_titles_id: Array.isArray(raw.job_titles_id)
      ? raw.job_titles_id.map((id, index) => ({
          id: Number(id),
          job_title: String(raw.job_title ?? `Role ${index + 1}`),
        }))
      : [],
    new_company: {
      id: Number.isFinite(employeeNewCompanyId) ? employeeNewCompanyId : undefined,
      name: companyName,
      locations_id: 0,
      sectors_id: [],
      _locations: null,
    },
  };
}

function normalizeIndividualFromApi(raw: Record<string, unknown>): Individual {
  // current_roles and roles are returned as JSON strings by Xano — parse them
  const parsedCurrentRoles =
    parseJsonStringField<unknown[]>(raw.current_roles) ?? [];
  const parsedRoles =
    parseJsonStringField<unknown[]>(raw.roles) ?? [];

  const currentRoles = Array.isArray(parsedCurrentRoles)
    ? parsedCurrentRoles
        .map((role, index) => {
          if (!role || typeof role !== "object") return null;
          const jobTitle = String(
            (role as { job_title?: unknown }).job_title ?? ""
          ).trim();
          if (!jobTitle) return null;
          return {
            id: index + 1,
            job_title: jobTitle,
          };
        })
        .filter((role): role is { id: number; job_title: string } => role != null)
    : [];

  const roles = Array.isArray(parsedRoles)
    ? parsedRoles
        .filter((role): role is Record<string, unknown> => !!role && typeof role === "object")
        .map(normalizeIndividualRole)
    : [];

  // _locations_individual is also returned as a JSON string by Xano
  const location = parseJsonStringField<Individual["_locations_individual"]>(
    raw._locations_individual
  );

  return {
    id: Number(raw.id),
    advisor_individuals: String(raw.advisor_individuals ?? "").trim(),
    current_company:
      raw.current_company == null || String(raw.current_company).trim() === ""
        ? null
        : String(raw.current_company),
    current_roles: currentRoles,
    _locations_individual: location,
    roles,
    locations_id: Number(raw.locations_id ?? 0),
    current_company_location: Array.isArray(raw.current_company_location)
      ? (raw.current_company_location as Individual["current_company_location"])
      : [],
  };
}

function mapIndividualsListResponse(
  data: IndividualsApiListResponse,
  fallbackPage: number,
  fallbackPerPage: number
): IndividualsListResponse {
  const rawItems = data.items ?? data.individuals ?? [];
  const items = rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(normalizeIndividualFromApi)
    .filter((item) => Number.isFinite(item.id));

  const perPage = data.perPage || fallbackPerPage;
  const itemsTotal = data.totalItems ?? data.totalIndividuals ?? items.length;
  const pageTotal =
    data.totalPages ??
    (perPage > 0 ? Math.max(1, Math.ceil(itemsTotal / perPage)) : 1);

  // The API returns `offset` as an item index (1, 51, 101 …), not a page number.
  // Convert it back to a 1-based page number for the FE.
  const rawOffset = data.offset;
  const curPage =
    rawOffset != null && perPage > 0
      ? Math.floor((rawOffset - 1) / perPage) + 1
      : (data.currentPage ?? fallbackPage);

  // nextOffset is null / absent on the last page
  const hasNext =
    data.nextOffset != null
      ? Number(data.nextOffset) > 0
      : curPage < pageTotal;

  return {
    items,
    curPage,
    nextPage: hasNext ? curPage + 1 : null,
    prevPage: curPage > 1 ? curPage - 1 : null,
    perPage,
    pageTotal,
    itemsTotal,
    summaryCounts: mapResponseToIndividualsSummaryCounts({
      individuals: items,
      totalIndividuals: itemsTotal,
      currentPage: curPage,
      perPage,
      totalPages: pageTotal,
      currentRoles: data.currentRoles ?? 0,
      pastRoles: data.pastRoles ?? 0,
      ceos: data.ceos ?? 0,
      chairs: data.chairs ?? 0,
      founders: data.founders ?? 0,
    }),
  };
}

// List lives on the main branch; counts endpoint is only on :develop.
const INDIVIDUALS_LIST_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R";
const INDIVIDUALS_COUNTS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R:develop";

async function resolveAuthToken(authToken?: string | null): Promise<string | null> {
  const explicit = authToken?.trim();
  if (explicit) return explicit;

  const cookieStore = await cookies();
  return cookieStore.get("asymmetrix_auth_token")?.value ?? null;
}

export async function fetchIndividualsServer(
  filters: IndividualsSearchFilters = createDefaultIndividualFilters(),
  authToken?: string | null
): Promise<IndividualsListResponse | null> {
  try {
    const token = await resolveAuthToken(authToken);
    if (!token) {
      console.error("fetchIndividualsServer: no auth token (cookie or client)");
      return null;
    }

    const payload = {
      ...filters,
      page: Math.max(1, filters.page || 1),
      per_page: filters.per_page > 0 ? filters.per_page : 50,
    };
    const url = `${INDIVIDUALS_LIST_API_BASE}/get_all_individuals`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(individualsFiltersToRequestBody(payload)),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Individuals API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const data = (await response.json()) as IndividualsApiListResponse;
    return mapIndividualsListResponse(data, payload.page, payload.per_page);
  } catch (error) {
    console.error("fetchIndividualsServer error:", error);
    return null;
  }
}

export async function fetchIndividualsCountsServer(
  filters: IndividualsSearchFilters = createDefaultIndividualFilters(),
  authToken?: string | null
): Promise<ReturnType<typeof mapIndividualsCountsResponse> | null> {
  try {
    const token = await resolveAuthToken(authToken);
    if (!token) return null;

    const params = individualsCountsFiltersToSearchParams(filters);
    const url = `${INDIVIDUALS_COUNTS_API_BASE}/get_individuals_counts?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Individuals counts API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return mapIndividualsCountsResponse(data);
  } catch (error) {
    console.error("fetchIndividualsCountsServer error:", error);
    return null;
  }
}

export async function fetchJobTitlesServer(
  authToken?: string | null
): Promise<Array<{ id: number; job_title: string }>> {
  try {
    const token = await resolveAuthToken(authToken);
    if (!token) return [];

    const response = await fetch(
      "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop/get_all_job_titles",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("fetchJobTitlesServer error:", error);
    return [];
  }
}

export { createDefaultIndividualFilters };
