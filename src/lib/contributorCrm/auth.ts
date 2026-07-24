const STORAGE_KEY = "outreach_crm_user";
const TOKEN_KEY = "outreach_crm_auth_token";
const CONTRIBUTOR_EMAIL_KEY = "outreach_crm_login_email";
const CONTRIBUTOR_COMPANY_KEY = "outreach_crm_company_id";
const CONTRIBUTOR_EXPECTED_COMPANY_KEY = "outreach_crm_expected_company_id";

/**
 * Decode the `exp` claim from a JWT without a library.
 * Returns the expiry timestamp in milliseconds, or null if the token
 * is missing / malformed / has no exp claim. //
 */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload?.exp !== "number") return null;
    return payload.exp * 1000; // convert seconds → ms
  } catch {
    return null;
  }
}

/**
 * Returns true when the stored token is present but its exp claim has
 * already passed (or is within the 30-second safety buffer).
 * Returns false when there is no token (absence is not "expired").
 */
export function isTokenExpired(token?: string | null): boolean {
  const t = token ?? getStoredToken();
  if (!t) return false;
  const expiry = getTokenExpiry(t);
  if (expiry === null) return false; // no exp claim → treat as non-expiring
  return Date.now() >= expiry - 30_000; // 30s buffer
}

export type User = {
  id: number;
  created_at: number;
  name: string;
  Company: number;
  email: string;
  Status: string;
  exported_companies_files: number;
  _new_company: { id: number; name: string };
};

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredContributorCompanyId(key: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function setStoredNumber(key: string, value: number | null): void {
  if (typeof window === "undefined") return;
  if (value == null) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, String(value));
}

function getBasePath(): string {
  // Mounted under the main app at /contributor-crm (no Next basePath).
  return "/contributor-crm";
}

function withBasePath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBasePath()}${normalizedPath}`;
}

export function buildContributorEntryPath(
  companyId: number | string,
  options?: { review?: boolean }
): string {
  const params = new URLSearchParams();
  if (options?.review) params.set("review", "1");
  const query = params.toString();
  const companyPath = withBasePath(`/${companyId}`);
  return query ? `${companyPath}?${query}` : companyPath;
}

export function buildContributorLoginPath(
  companyId?: number | string | null,
  sessionExpired?: boolean,
  options?: { review?: boolean }
): string {
  const params = new URLSearchParams();
  if (companyId != null) params.set("companyId", String(companyId));
  if (sessionExpired) params.set("expired", "1");
  if (options?.review) params.set("review", "1");
  const query = params.toString();
  const loginPath = withBasePath("/login");
  return query ? `${loginPath}?${query}` : loginPath;
}

export function buildCompanyAccessErrorPath(companyId?: number | null): string {
  const params = new URLSearchParams();
  if (companyId != null) params.set("companyId", String(companyId));
  const query = params.toString();
  const errorPath = withBasePath("/company-access-error");
  return query ? `${errorPath}?${query}` : errorPath;
}

export function buildInternalCrmPath(): string {
  return withBasePath("/internal-crm");
}

export function buildTeamLoginPath(): string {
  return withBasePath("/team-login");
}

export function buildInternalReviewPath(
  companyId: number | string,
  options?: {
    review?: boolean;
    reviewType?: "company" | "fin-metrics";
    companyName?: string | null;
  }
): string {
  const params = new URLSearchParams({ companyId: String(companyId) });
  if (options?.review) params.set("review", "1");
  if (options?.reviewType) params.set("reviewType", options.reviewType);
  if (options?.companyName?.trim()) params.set("companyName", options.companyName.trim());
  return `${withBasePath("/internal-crm")}?${params.toString()}`;
}

/** Absolute URL to open internal CRM review for a submitted change request. */
export function buildInternalReviewUrl(
  companyId: number | string,
  options?: {
    review?: boolean;
    reviewType?: "company" | "fin-metrics";
    companyName?: string | null;
  }
): string {
  const path = buildInternalReviewPath(companyId, options);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function getUserStatus(user: User | null | undefined): string {
  return user?.Status?.trim().toLowerCase() ?? "";
}

export function isAdminUser(user: User | null | undefined): boolean {
  return getUserStatus(user) === "admin";
}

export const contributorAccessService = {
  getLoginEmail(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CONTRIBUTOR_EMAIL_KEY);
  },

  setLoginEmail(email: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(CONTRIBUTOR_EMAIL_KEY, email.trim());
  },

  getCompanyId(): number | null {
    return getStoredContributorCompanyId(CONTRIBUTOR_COMPANY_KEY);
  },

  setCompanyId(companyId: number | null): void {
    setStoredNumber(CONTRIBUTOR_COMPANY_KEY, companyId);
  },

  getExpectedCompanyId(): number | null {
    return getStoredContributorCompanyId(CONTRIBUTOR_EXPECTED_COMPANY_KEY);
  },

  setExpectedCompanyId(companyId: number | null): void {
    setStoredNumber(CONTRIBUTOR_EXPECTED_COMPANY_KEY, companyId);
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CONTRIBUTOR_EMAIL_KEY);
    localStorage.removeItem(CONTRIBUTOR_COMPANY_KEY);
    localStorage.removeItem(CONTRIBUTOR_EXPECTED_COMPANY_KEY);
  },
};

export const authService = {
  getUser(): User | null {
    return getStoredUser();
  },

  getAuthToken(): string | null {
    return getStoredToken();
  },

  setUser(user: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },

  setAuthToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearUser(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },
};
