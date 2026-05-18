import { authService } from "./auth";
import { dispatchUnauthorized } from "./authEvents";

interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

interface CollectionParams {
  limit?: number;
  offset?: number;
  filter?: Record<string, unknown>;
  sort?: Record<string, unknown>;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/5YnK3rYr";
    console.log("API Service Base URL:", this.baseUrl); // Debug log
  }

  // Make authenticated API request
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers = {
      "Content-Type": "application/json",
      ...authService.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid — show the login modal instead of redirecting
        authService.logout();
        dispatchUnauthorized();
        throw new Error("Authentication required");
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Fetch collection data
  async fetchCollection<T>(
    collectionName: string,
    params: CollectionParams = {}
  ): Promise<ApiResponse<T[]>> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.offset) queryParams.append("offset", params.offset.toString());
    if (params.filter)
      queryParams.append("filter", JSON.stringify(params.filter));
    if (params.sort) queryParams.append("sort", JSON.stringify(params.sort));

    const endpoint = `/collection/${collectionName}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    return this.request<T[]>(endpoint);
  }

  // Get single item from collection
  async getItem<T>(
    collectionName: string,
    id: string
  ): Promise<ApiResponse<T>> {
    return this.request<T>(`/collection/${collectionName}/${id}`);
  }

  // Create new item in collection
  async createItem<T>(
    collectionName: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(`/collection/${collectionName}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Update item in collection
  async updateItem<T>(
    collectionName: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(`/collection/${collectionName}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Delete item from collection
  async deleteItem(
    collectionName: string,
    id: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/collection/${collectionName}/${id}`, {
      method: "DELETE",
    });
  }

  // Custom API call
  async customRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Ensure endpoint starts with a slash
    const formattedEndpoint = endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;
    return this.request<T>(formattedEndpoint, options);
  }
}

export const apiService = new ApiService();
export type { ApiResponse, CollectionParams };

/** Asymmetrix directory user for searchable email pickers (admin). */
export type UserEmailItem = {
  id?: number;
  name: string;
  email: string;
};

/** Canonical domain for admin / CRM sender pickers (`user_emails` search + UI suffix). */
export const ASYMMETRIX_INTELLIGENCE_EMAIL_DOMAIN =
  "@asymmetrixintelligence.com";

/** Search sent to `user_emails`. Lowercase tokens like `alex` → `alex@asymmetrixintelligence.com`; mixed-case (`Honor`) is sent raw for name matching. */
function buildUserEmailsApiQuery(raw: string): string {
  const q = raw.trim();
  if (!q) return "";
  if (q.includes("@")) return q;
  const domainBody = ASYMMETRIX_INTELLIGENCE_EMAIL_DOMAIN.slice(1).toLowerCase();
  if (q.toLowerCase() === domainBody) return q;

  // Display-name style fragment (Honor, Alex, Piero) — do not force email shape.
  if (q !== q.toLowerCase()) return q;

  if (/\s/.test(q)) return q;

  // Typical initials.local address — narrow via full email at our domain.
  if (q.includes(".")) return `${q}${ASYMMETRIX_INTELLIGENCE_EMAIL_DOMAIN}`;

  // Lowercase token without dot (e.g. alex) — historical email-prefix query.
  return `${q}${ASYMMETRIX_INTELLIGENCE_EMAIL_DOMAIN}`;
}

function unwrapUserEmailsRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const candidates = [
      o.user_emails,
      o.items,
      o.users,
      o.emails,
      o.result,
      o.data,
      o.records,
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
  }
  return [];
}

const XANO_USER_EMAILS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI/user_emails";

async function fetchUserEmailsJson(
  token: string,
  queryParam: string
): Promise<unknown> {
  const url = new URL(XANO_USER_EMAILS_URL);
  url.searchParams.set("query", queryParam);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to load sender emails");
  }
  return res.json();
}

function mapUserEmailRows(
  rows: unknown[],
  filterQuery: string
): UserEmailItem[] {
  const q = filterQuery.trim().toLowerCase();
  const mapped: UserEmailItem[] = [];
  const seenEmail = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const idRaw = r.id ?? r._id ?? r.user_emails_id ?? r.user_email_id;
    const id =
      typeof idRaw === "number" && Number.isFinite(idRaw)
        ? Math.trunc(idRaw)
        : typeof idRaw === "string"
          ? parseInt(idRaw, 10)
          : undefined;

    const emailRaw =
      r.email ??
      r.Email ??
      r.user_email ??
      r.address ??
      r.mail ??
      r.username ??
      "";
    const email = String(emailRaw ?? "").trim();
    if (!email) continue;
    if (seenEmail.has(email)) continue;
    seenEmail.add(email);

    const name = String(
      r.name ?? r.Name ?? r.display_name ?? r.full_name ?? ""
    ).trim();
    const item: UserEmailItem = {
      ...(typeof id === "number" && Number.isFinite(id) && id > 0
        ? { id }
        : {}),
      name:
        name ||
        (email.includes("@") ? email.slice(0, email.indexOf("@")) : email) ||
        email,
      email,
    };
    if (
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q)
    ) {
      mapped.push(item);
    }
  }
  return mapped;
}

/**
 * Loads sender emails via Xano `GET …/user_emails` with Bearer auth.
 * Uses `buildUserEmailsApiQuery`; if that yields no rows, retries once with the raw
 * trimmed query so lowercase name fragments (e.g. honor → h.crean) still match.
 */
export async function fetchAsymmetrixUsersForEmailSelect(
  token: string,
  query: string
): Promise<UserEmailItem[]> {
  if (!token?.trim()) {
    throw new Error("Authentication required");
  }
  const trimmed = query.trim();

  const primaryQ = buildUserEmailsApiQuery(trimmed);
  let data = await fetchUserEmailsJson(token, primaryQ);
  let rows = unwrapUserEmailsRows(data);
  let mapped = mapUserEmailRows(rows, trimmed);

  if (
    mapped.length === 0 &&
    trimmed.length > 0 &&
    !trimmed.includes("@") &&
    primaryQ !== trimmed
  ) {
    data = await fetchUserEmailsJson(token, trimmed);
    rows = unwrapUserEmailsRows(data);
    mapped = mapUserEmailRows(rows, trimmed);
  }

  return mapped;
}

/** Alias for directory-backed sender search (same contract as Fin Metrics email modal). */
export async function getUserEmails(
  token: string,
  query: string
): Promise<UserEmailItem[]> {
  return fetchAsymmetrixUsersForEmailSelect(token, query);
}

/** Basic user row from `all_users` (admin Email Builder multi-select). */
export type BasicUserItem = {
  id: number;
  name: string;
  email: string;
  Company?: number;
  created_at?: number;
};

/** Full list from `/api/all-users` (Bearer auth). Filter client-side for search. */
export async function fetchAllUsers(token: string): Promise<BasicUserItem[]> {
  const res = await fetch("/api/all-users", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to load users");
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data as BasicUserItem[];
}
