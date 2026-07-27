import type { CorporateEvent } from "@/components/corporate-events/CorporateEventsTable";
import { COMPANIES_API_BASE } from "@/lib/companiesFilterPayload";

const COMPANY_CORPORATE_EVENTS_BASE = `${COMPANIES_API_BASE}/get_company_corporate_events`;

export type CompanyCorporateEventsPage = {
  items: CorporateEvent[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  next_page: number | null;
  prev_page: number | null;
  showing_from: number;
  showing_to: number;
};

function computeShowingRange(
  page: number,
  pageSize: number,
  total: number,
  itemCount: number
): { showing_from: number; showing_to: number } {
  if (total <= 0 || itemCount <= 0) {
    return { showing_from: 0, showing_to: 0 };
  }
  const showing_from = (page - 1) * pageSize + 1;
  const showing_to = showing_from + itemCount - 1;
  return { showing_from, showing_to };
}

export async function fetchCompanyCorporateEvents(
  newCompanyId: string | number,
  page = 1,
  pageSize = 2
): Promise<CompanyCorporateEventsPage | null> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;
  if (!token) return null;

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const url = `${COMPANY_CORPORATE_EVENTS_BASE}/${encodeURIComponent(
    String(newCompanyId)
  )}?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    items?: CorporateEvent[];
    total?: number;
    page?: number;
    page_size?: number;
    total_pages?: number;
    next_page?: number | null;
    prev_page?: number | null;
    showing_from?: number;
    showing_to?: number;
  };

  const items = Array.isArray(data.items) ? data.items : [];
  const total = typeof data.total === "number" ? data.total : items.length;
  const resolvedPage = typeof data.page === "number" ? data.page : page;
  const resolvedPageSize =
    typeof data.page_size === "number" ? data.page_size : pageSize;
  const total_pages =
    typeof data.total_pages === "number"
      ? data.total_pages
      : total > 0
        ? Math.ceil(total / resolvedPageSize)
        : 0;

  const range =
    typeof data.showing_from === "number" && typeof data.showing_to === "number"
      ? { showing_from: data.showing_from, showing_to: data.showing_to }
      : computeShowingRange(resolvedPage, resolvedPageSize, total, items.length);

  return {
    items,
    total,
    page: resolvedPage,
    page_size: resolvedPageSize,
    total_pages,
    next_page: data.next_page ?? (resolvedPage < total_pages ? resolvedPage + 1 : null),
    prev_page: data.prev_page ?? (resolvedPage > 1 ? resolvedPage - 1 : null),
    showing_from: range.showing_from,
    showing_to: range.showing_to,
  };
}
