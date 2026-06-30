import type { ProductUsersSection } from "@/components/redesign/ProductUsersListCard";
import { COMPANIES_API_BASE } from "@/lib/companiesFilterPayload";

export type CompanyProductUsersItem = {
  title?: string | null;
  description?: string | null;
  body?: string | null;
};

export type CompanyProductUsersRecord = {
  id?: number;
  created_at?: number;
  company?: number;
  products?: CompanyProductUsersItem[] | null;
  users?: CompanyProductUsersItem[] | null;
};

export type CompanyProductUsersData = {
  products: ProductUsersSection[];
  users: ProductUsersSection[];
};

function normalizeItemText(value: unknown): string {
  return String(value ?? "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function mapProductUsersItems(
  items: unknown
): ProductUsersSection[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): ProductUsersSection | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as CompanyProductUsersItem;
      const title = normalizeItemText(row.title);
      if (!title) return null;
      const body = normalizeItemText(row.description ?? row.body);
      return body ? { title, body } : { title };
    })
    .filter((entry): entry is ProductUsersSection => entry != null);
}

function isProductUsersRecord(value: unknown): value is CompanyProductUsersRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as CompanyProductUsersRecord;
  return Array.isArray(record.products) || Array.isArray(record.users);
}

function recordRichness(record: CompanyProductUsersRecord): number {
  return (
    mapProductUsersItems(record.products).length +
    mapProductUsersItems(record.users).length
  );
}

function pickBestProductUsersRecord(
  rows: unknown[]
): CompanyProductUsersRecord | undefined {
  const records = rows.filter(isProductUsersRecord);
  if (records.length === 0) return undefined;
  if (records.length === 1) return records[0];

  return records.reduce((best, row) => {
    const bestRichness = recordRichness(best);
    const rowRichness = recordRichness(row);
    if (rowRichness !== bestRichness) {
      return rowRichness > bestRichness ? row : best;
    }
    return (row.created_at ?? 0) > (best.created_at ?? 0) ? row : best;
  });
}

/** Parse v2 record wrapper or legacy `{ title, body }[]` arrays. */
export function parseCompanyProductUsersResponse(
  data: unknown,
  legacyKind: "products" | "users" = "products"
): CompanyProductUsersData {
  if (!Array.isArray(data) || data.length === 0) {
    return { products: [], users: [] };
  }

  const record = pickBestProductUsersRecord(data);
  if (record) {
    return {
      products: mapProductUsersItems(record.products),
      users: mapProductUsersItems(record.users),
    };
  }

  const legacy = mapProductUsersItems(data);
  return legacyKind === "users"
    ? { products: [], users: legacy }
    : { products: legacy, users: [] };
}

async function fetchProductUsersEndpoint(
  endpoint: string,
  newCompanyId: string | number,
  legacyKind: "products" | "users"
): Promise<CompanyProductUsersData> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const params = new URLSearchParams({ new_company_id: String(newCompanyId) });
  const res = await fetch(`${endpoint}?${params.toString()}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    return { products: [], users: [] };
  }

  const data: unknown = await res.json();
  return parseCompanyProductUsersResponse(data, legacyKind);
}

const COMPANY_USERS_USE_CASES_BASE = `${COMPANIES_API_BASE}/company_users_use_cases`;
const COMPANY_PRODUCTS_SERVICES_BASE = `${COMPANIES_API_BASE}/company_products_services`;

/** Fetch products and users from the unified use-cases endpoint, with legacy products fallback. */
export async function fetchCompanyProductUsers(
  newCompanyId: string | number
): Promise<CompanyProductUsersData> {
  const primary = await fetchProductUsersEndpoint(
    COMPANY_USERS_USE_CASES_BASE,
    newCompanyId,
    "users"
  );

  if (primary.products.length > 0 || primary.users.length > 0) {
    if (primary.products.length > 0) {
      return primary;
    }

    const productsFallback = await fetchProductUsersEndpoint(
      COMPANY_PRODUCTS_SERVICES_BASE,
      newCompanyId,
      "products"
    );

    return {
      products: productsFallback.products,
      users: primary.users,
    };
  }

  const productsFallback = await fetchProductUsersEndpoint(
    COMPANY_PRODUCTS_SERVICES_BASE,
    newCompanyId,
    "products"
  );

  return {
    products: productsFallback.products,
    users: [],
  };
}
