const API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";
const AUTH_LOGIN_URL = `${API_BASE}/auth/login`;
const AUTH_ME_URL = `${API_BASE}/auth/me`;
const AUTH_REQUEST_CLIENT_LOGIN_URL = `${API_BASE}/auth/request-client-login`;
const OTP_URL = `${API_BASE}/otp`;
const OTP_LOGIN_URL = `${API_BASE}/otp_login`;

export type LoginResponse = {
  authToken: string;
};

export type MeResponse = {
  id: number;
  created_at: number;
  name: string;
  Company: number;
  email: string;
  Status: string;
  exported_companies_files: number;
  _new_company: { id: number; name: string };
};

export async function loginWithApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(AUTH_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Login failed (${res.status})`);
  }

  const data = (await res.json()) as LoginResponse;
  if (!data?.authToken) {
    throw new Error("Invalid login response");
  }
  return data;
}

/** Request a sign-in link for client login (email-only). Backend sends magic link to email. */
export async function requestClientLogin(email: string): Promise<void> {
  const res = await fetch(AUTH_REQUEST_CLIENT_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
}

/** Send 6-digit OTP to email. POST /otp with { to: email }. */
export async function sendOtp(to: string): Promise<void> {
  const res = await fetch(OTP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: to.trim() }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to send code (${res.status})`);
  }
}

export type OtpLoginResponse = { token: string };

/** Verify OTP and get token. POST /otp_login with { email, otp }. */
export async function otpLogin(email: string, otp: string): Promise<OtpLoginResponse> {
  const res = await fetch(OTP_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Verification failed (${res.status})`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const token =
    typeof data?.token === "string"
      ? data.token
      : typeof (data as { Token?: string })?.Token === "string"
        ? (data as { Token: string }).Token
        : typeof data?.access_token === "string"
          ? data.access_token
          : null;
  if (!token) {
    throw new Error("Invalid response: missing token");
  }
  return { token };
}

export async function fetchMe(token: string): Promise<MeResponse> {
  const res = await fetch(AUTH_ME_URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch user (${res.status})`);
  }

  const data = (await res.json()) as MeResponse;
  if (data?.id == null || !data?.email) {
    throw new Error("Invalid /me response");
  }
  return data;
}

// Internal CRM — financial metrics companies (different API base)
const FIN_METRICS_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:tDNMS_i0";
const CONTRIBUTOR_METRICS_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:bSPJOS6A";
const COMPANY_LOOKUP_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:8Bv5PK4I";
const LOOKUP_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob";

export type SectorOption = { id: number; sector_name: string };

function buildHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function getPrimarySectors(token?: string): Promise<SectorOption[]> {
  const res = await fetch(`${LOOKUP_BASE}/all__primary_sector`, {
    headers: buildHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to load primary sectors (${res.status})`);
  return (await res.json()) as SectorOption[];
}

export async function getSecondarySectors(token?: string): Promise<SectorOption[]> {
  const res = await fetch(`${LOOKUP_BASE}/fetch_all_secondary_sectors`, {
    headers: buildHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to load secondary sectors (${res.status})`);
  return (await res.json()) as SectorOption[];
}

export async function getOwnershipTypes(token?: string): Promise<{ id: number; ownership: string }[]> {
  const res = await fetch(`${LOOKUP_BASE}/Get_Ownership_Types`, {
    headers: buildHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to load ownership types (${res.status})`);
  return (await res.json()) as { id: number; ownership: string }[];
}

export async function getBusinessFocuses(
  token?: string
): Promise<{ id: number; business_focus: string }[]> {
  const res = await fetch(`/contributor-crm/api/business_focuses`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to load business focuses (${res.status})`);
  const data = (await res.json()) as unknown;
  if (Array.isArray(data)) {
    return data as { id: number; business_focus: string }[];
  }
  if (data && typeof data === "object") {
    const record = data as { items?: unknown; result?: unknown; data?: unknown };
    if (Array.isArray(record.items)) {
      return record.items as { id: number; business_focus: string }[];
    }
    if (Array.isArray(record.result)) {
      return record.result as { id: number; business_focus: string }[];
    }
    if (Array.isArray(record.data)) {
      return record.data as { id: number; business_focus: string }[];
    }
  }
  return [];
}

export type FinMetricsCompanyItem = {
  company_id: number;
  company_name: string | number;
  fin_metrics_added_at: number;
  fm_row_count: number;
  financial_years: unknown; // e.g. {2025} or array
  workflow_id: number;
  key_contact_email: string | null;
  date_contacted: string | null;
  follow_up_date: string | null;
  contributed: boolean;
  status?: string | null;
  needs_review: boolean;
  needs_review_company?: boolean;
  needs_review_fin_metrics?: boolean;
};

export type FinMetricsReviewDecisionEntry = {
  value?: unknown;
  status?: string;
};

export type FinMetricsChangeItem = {
  id: number;
  submitted_by: string;
  submitted_at: number;
  /** POST = new record; PATCH = update. API may use different casing or omit. */
  workflow?: "POST" | "PATCH" | string;
  /** Contributor workflow label from API e.g. "Contributed & Approved". */
  status?: string | null;
  contributor_status?: string | null;
  change_status?: string | null;
  old: Record<string, unknown>;
  new: Record<string, unknown>;
  documents: XanoStoredFile[];
  /** Persisted reviewer field outcomes from API (e.g. `{ EV: { value, status: "rejected" } }`). */
  review_decisions?: Record<string, FinMetricsReviewDecisionEntry | unknown>;
};

export type FinMetricsChangeRequest = {
  new_company_id: number;
  request_count: number;
  changes: FinMetricsChangeItem[];
};

export type FinancialMetricsPatchPayload = {
  financial_metrics_id: number;
  new_company_id: number;
  Created_by: number;
  Financial_Year: number;
  FY_YE_Month_Dec_default: string;
  Rev_Currency: number;
  Revenue_m: number | null;
  Rev_source: number | null;
  ARR_pc: number | null;
  ARR_currency: number;
  ARR_m: number | null;
  ARR_source: number | null;
  Churn_pc: number | null;
  Churn_Source: number | null;
  GRR_pc: number | null;
  GRR_source: number | null;
  Upsell_pc: number | null;
  Upsell_source: number | null;
  Cross_sell_pc: number | null;
  Cross_sell_source: number | null;
  Price_increase_pc: number | null;
  Price_increase_source: number | null;
  Rev_expansion_pc: number | null;
  Rev_expansion_source: number | null;
  NRR: number | null;
  NRR_source: number | null;
  New_client_growth_pc: number | null;
  New_Client_Growth_Source: number | null;
  Rev_Growth_PC: number | null;
  Rev_Growth_source: number | null;
  EBITDA_margin: number | null;
  EBITDA_margin_source: number | null;
  EBITDA_currency: number;
  EBITDA_m: number | null;
  EBITDA_source: number | null;
  Rule_of_40: number | null;
  Rule_of_40_source: number | null;
  Revenue_multiple: number | null;
  Rev_x_source: number | null;
  EV_currency: number;
  EV: number | null;
  EV_source: number | null;
  EBIT_currency: number;
  EBIT_m: number | null;
  EBIT_source: number | null;
  No_of_Clients: number | null;
  No_Clients_source: number | null;
  Rev_per_client: number | null;
  Rev_per_client_source: number | null;
  No_Employees: number | null;
  No_Employees_source: number | null;
  Revenue_per_employee: number | null;
  Rev_per_employee_source: number | null;
  Data_entry_notes: string;
  Revenue_m_usd: number | null;
  EV_usd: number | null;
  ARR_m_usd: number | null;
  EBITDA_m_usd: number | null;
  EBIT_m_usd: number | null;
  fx_bucket: string;
};

export type FinancialMetricsCreatePayload = Omit<
  FinancialMetricsPatchPayload,
  "financial_metrics_id"
>;

export async function getFinMetricsChangeRequest(
  token: string,
  companyId: number
): Promise<FinMetricsChangeRequest> {
  const url = `${FIN_METRICS_BASE}/financial_change_request?new_company_id=${companyId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to load fin metrics change request (${res.status})`);
  }
  return (await res.json()) as FinMetricsChangeRequest;
}

export async function patchFinancialMetrics(
  token: string,
  financialMetricsId: number,
  payload: FinancialMetricsPatchPayload
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${CONTRIBUTOR_METRICS_BASE}/financial_metrics/${financialMetricsId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update financial metrics (${res.status})`);
  }

  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function createFinancialMetrics(
  token: string,
  payload: FinancialMetricsCreatePayload
): Promise<Record<string, unknown>> {
  const res = await fetch(`${CONTRIBUTOR_METRICS_BASE}/financial_metrics`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create financial metrics (${res.status})`);
  }

  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * POST workflow: submit reviewer-approved fin metrics data to fin_metrics endpoint.
 * Body shape: { "new_data": { ...approvedFields } }
 */
export async function submitFinMetricsPost(
  token: string,
  newData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(`${FIN_METRICS_BASE}/fin_metrics`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ new_data: newData }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to submit financial metrics (${res.status})`);
  }

  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * PATCH workflow: submit reviewer-approved fin metrics changes to fin_metrics_patch.
 * Body shape: { "new_data": { id: <fin_metrics_id>, ...acceptedFields } }
 */
export async function submitFinMetricsPatch(
  token: string,
  newData: Record<string, unknown>,
  changeId: number
): Promise<Record<string, unknown>> {
  const res = await fetch(`${FIN_METRICS_BASE}/fin_metrics_patch`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ new_data: newData, change_id: changeId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to patch financial metrics (${res.status})`);
  }

  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const CHANGE_REQUEST_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:tDNMS_i0";

export async function applyCompanyChangeRequest(
  token: string,
  payload: Record<string, unknown>,
  changeId: number | string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${CHANGE_REQUEST_BASE}/apply_company_change_request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ payload, change_id: changeId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to apply change request (${res.status})`);
  }
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Body for PATCH `{CHANGE_REQUEST_BASE}/change_request/{id}` (financial metrics review sync). */
export type ChangeRequestReviewDecisionsPayload = {
  change_request_id: number;
  entity_type: string;
  submitted_by: string;
  old: Record<string, unknown>;
  new: Record<string, unknown>;
  reviewed_by: number;
  new_company_id: number;
  documents: unknown[];
  workflow: string;
  status: string;
  /** Rejected-field snapshot from reviewer UI (`value` + `status: rejected` per key). */
  review_decisions: Record<string, unknown>;
};

/** Requires a valid bearer token — same auth pattern as other `CHANGE_REQUEST_BASE` routes. */
export async function patchChangeRequestReviewDecisions(
  token: string,
  changeRequestId: number,
  body: ChangeRequestReviewDecisionsPayload
): Promise<void> {
  const auth = token?.trim();
  if (!auth) {
    throw new Error("Authentication required");
  }
  const res = await fetch(`${CHANGE_REQUEST_BASE}/change_request/${changeRequestId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to sync review decisions (${res.status})`);
  }
}

export type GetFinMetricsCompaniesParams = {
  search?: string | null;
  contributed_filter?: boolean | null;
  status_filter?: string | null;
  needs_review_filter?: boolean | null;
  page?: number;
  per_page?: number;
};

export type GetFinMetricsCompaniesResponse = {
  items: FinMetricsCompanyItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type UpdateFinMetricsWorkflowPayload = {
  company_id: number;
  key_contact_email?: string | null;
  date_contacted?: string | null;
  follow_up_date?: string | null;
  contributed?: boolean;
};

export type ContributorYearItem = {
  id: number;
  created_at: number;
  Year: number | string;
};

export type ContributorCompanyMetricsItem = Record<string, unknown>;
export type XanoStoredFile = {
  path: string;
  name: string;
  url?: string;
  mime?: string;
  size?: number;
  access?: string;
  type?: string;
  meta?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type ChangeRequestPayload = {
  entity_type: string;
  new_company_id?: number;
  submitted_by: string;
  old: Record<string, unknown>;
  new: Record<string, unknown>;
  approved: boolean;
  reviewed_by: number;
  documents?: XanoStoredFile[];
  workflow?: "POST" | "PATCH";
};

function contributorApiPath(path: string): string {
  const base = "/contributor-crm";
  return `${base}/api/contributor${path}`;
}

async function readContributorApiError(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    const text = await res.text().catch(() => "");
    return text || fallback;
  }
}

export type ChangeRequestItem = {
  id: number;
  created_at?: number;
  entity_type?: string;
  submitted_by?: string | string[];
  status?: string | null;
  workflow?: string | null;
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
  merged_old?: Record<string, unknown>;
  merged_new?: Record<string, unknown>;
  approved?: boolean;
  reviewed_by?: number;
  new_company_id?: number;
  request_count?: number;
  request_ids?: number[];
  any_unreviewed?: boolean;
  documents?: XanoStoredFile[];
  /** Persisted per-field reviewer outcomes from API */
  review_decisions?: Record<string, unknown>;
};

export type CompanyChangeRequestSummary = {
  id: number;
  submitted_by?: string | string[];
  status?: string | null;
  created_at?: number;
  entity_type?: string;
  new_company_id?: number;
};

export type CompanyLookupItem = {
  id: number;
  name: string;
  url?: string;
};

export async function getFinMetricsCompanies(
  token: string,
  params: GetFinMetricsCompaniesParams = {}
): Promise<GetFinMetricsCompaniesResponse> {
  const {
    search,
    contributed_filter = false,
    status_filter = null,
    needs_review_filter = false,
    page = 1,
    per_page = 25,
  } = params;
  const q = new URLSearchParams();
  if (search != null && search !== "") q.set("search", search);
  q.set("contributed_filter", String(Boolean(contributed_filter)));
  if (status_filter) q.set("status_filter", status_filter);
  q.set("needs_review_filter", String(Boolean(needs_review_filter)));
  q.set("page", String(page));
  q.set("per_page", String(per_page));
  const url = `${FIN_METRICS_BASE}/get_fin_metrics_companies?${q.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch companies (${res.status})`);
  }

  const data = (await res.json()) as GetFinMetricsCompaniesResponse;
  if (!Array.isArray(data?.items)) {
    throw new Error("Invalid get_fin_metrics_companies response");
  }
  return data;
}

export async function updateFinMetricsWorkflow(
  token: string,
  payload: UpdateFinMetricsWorkflowPayload
): Promise<void> {
  const res = await fetch(`${FIN_METRICS_BASE}/update_fin_metrics_workflow`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update workflow (${res.status})`);
  }
}

export async function saveCompanyContactEmail(
  token: string,
  companyId: number,
  email: string
): Promise<void> {
  await updateFinMetricsWorkflow(token, {
    company_id: companyId,
    key_contact_email: email.trim() || null,
  });
}

export async function getContributorYears(): Promise<ContributorYearItem[]> {
  const res = await fetch(`${CONTRIBUTOR_METRICS_BASE}/years`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch years (${res.status})`);
  }

  const data = (await res.json()) as ContributorYearItem[];
  return Array.isArray(data) ? data : [];
}

/**
 * Fetches financial metrics for a company.
 * API defaults to current year; if data for the requested year is not available,
 * it returns the closest available metrics. Response may include `year_value`
 * to indicate the actual year of the returned data.
 * @param newRecord - false on first load, true when user switches years in dropdown
 */
export async function getContributorMetricsByCompany(
  newCompanyId: number,
  yearsId: number,
  token?: string | null,
  newRecord: boolean = false
): Promise<ContributorCompanyMetricsItem | null> {
  const params = new URLSearchParams({
    new_company_id: String(newCompanyId),
    years_id: String(yearsId),
    new_record: String(newRecord),
  });

  const res = await fetch(
    `${CONTRIBUTOR_METRICS_BASE}/metrics/by_company?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch company metrics (${res.status})`);
  }

  const data = (await res.json()) as unknown;
  if (Array.isArray(data)) {
    return (data[0] as ContributorCompanyMetricsItem | undefined) ?? null;
  }
  return data && typeof data === "object"
    ? (data as ContributorCompanyMetricsItem)
    : null;
}

export type AcceptNewEntityPayload = {
  entity_type: string;
  action: "approve" | "reject";
  data: Record<string, unknown>;
  change_request_id?: number;
  parent_company_id?: number;
};

/**
 * POST a brand-new entity profile so the team can create it in the DB.
 * entity_type: "company" | "corporate_event" | "management_person" | "subsidiary" | "counterparty"
 * NOTE: update the endpoint path once the backend route is confirmed.
 */
export async function acceptNewEntityProfile(
  token: string,
  payload: AcceptNewEntityPayload
): Promise<Record<string, unknown>> {
  const res = await fetch(`${FIN_METRICS_BASE}/accept_new_entity_profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to accept new entity profile (${res.status})`);
  }

  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function createChangeRequest(
  token: string | null | undefined,
  payload: ChangeRequestPayload
): Promise<void> {
  if (!token) {
    const res = await fetch(contributorApiPath("/change-request"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        await readContributorApiError(res, `Failed to submit change request (${res.status})`)
      );
    }
    return;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${FIN_METRICS_BASE}/change_request`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to submit change request (${res.status})`);
  }
}

export type DataContributionNotificationPayload = {
  contributor_name: string;
  contributor_email: string;
  company_name: string;
  request_url: string;
  field_name: string;
  notes: string;
};

/** Notify reviewers when a contributor submits data for review. */
export async function notifyDataContribution(
  _token: string | null | undefined,
  payload: DataContributionNotificationPayload
): Promise<void> {
  // Always use the Next.js proxy so Xano is called with the service account.
  // Contributor JWTs can submit change requests but cannot send review emails.
  const res = await fetch(contributorApiPath("/notifications/data-contribution"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await readContributorApiError(
        res,
        `Failed to send data contribution notification (${res.status})`
      )
    );
  }
}

/** Fetch company data for public contributor links via server-side service auth. */
export async function fetchPublicContributorCompany(
  companyId: string | number
): Promise<unknown> {
  const res = await fetch(contributorApiPath(`/company/${companyId}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      await readContributorApiError(res, `Failed to fetch company (${res.status})`)
    );
  }

  return res.json();
}

const XANO_FILE_UPLOAD_BASE = "https://xdil-abvj-o7rq.e2.xano.io";
const XANO_NEW_FILE_ENDPOINT = `${XANO_FILE_UPLOAD_BASE}/api:Z3F6JUiu/new_file`;

function coerceXanoStoredFile(json: unknown): XanoStoredFile | null {
  if (!json || typeof json !== "object") return null;

  const root = json as Record<string, unknown>;
  const candidate = [root.file, root.mp3, root.image, root.data, root].find(
    (value) => value && typeof value === "object"
  );

  if (!candidate || typeof candidate !== "object") return null;

  const stored = candidate as Record<string, unknown>;
  const path = typeof stored.path === "string" ? stored.path : null;
  const name = typeof stored.name === "string" ? stored.name : null;

  if (!path || !name) return null;

  const urlValue =
    typeof stored.url === "string"
      ? stored.url
      : path.startsWith("/vault/")
        ? `${XANO_FILE_UPLOAD_BASE}${path}`
        : undefined;

  return {
    ...stored,
    path,
    name,
    ...(urlValue ? { url: urlValue } : {}),
  };
}

export async function uploadFileToXano(
  token: string | null | undefined,
  file: File
): Promise<XanoStoredFile> {
  if (!token) {
    const fd = new FormData();
    fd.append("file", file, file.name);

    const res = await fetch(contributorApiPath("/upload"), {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      throw new Error(
        await readContributorApiError(res, `File upload failed (${res.status})`)
      );
    }

    const json = (await res.json().catch(() => ({}))) as unknown;
    const stored = coerceXanoStoredFile(json);
    if (!stored) {
      throw new Error("Upload response missing stored file object");
    }
    return stored;
  }

  const fd = new FormData();
  fd.append("file", file, file.name);

  const headers: Record<string, string> = {};
  headers.Authorization = `Bearer ${token}`;

  const res = await fetch(XANO_NEW_FILE_ENDPOINT, {
    method: "POST",
    headers,
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `File upload failed (${res.status})`);
  }

  const json = (await res.json().catch(() => ({}))) as unknown;
  const stored = coerceXanoStoredFile(json);
  if (!stored) {
    throw new Error("Upload response missing stored file object");
  }

  return stored;
}

export async function reviewChangeRequest(
  token: string,
  requestId: number,
  approved: boolean
): Promise<void> {
  const res = await fetch(`${FIN_METRICS_BASE}/change_request/${requestId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ approved }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to review change request (${res.status})`);
  }
}

export async function getChangeRequests(
  token: string,
  companyId?: number
): Promise<ChangeRequestItem[]> {
  const params = new URLSearchParams();
  if (companyId != null) {
    params.set("new_company_id", String(companyId));
  }

  const res = await fetch(
    `${FIN_METRICS_BASE}/change_request${params.toString() ? `?${params.toString()}` : ""}`,
    {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch change requests (${res.status})`);
  }

  const data = (await res.json()) as unknown;
  if (Array.isArray(data)) return data as ChangeRequestItem[];
  if (data && typeof data === "object") return [data as ChangeRequestItem];
  return [];
}

export async function getCompanyChangeRequestSummaries(
  token: string,
  companyId: number
): Promise<CompanyChangeRequestSummary[]> {
  const params = new URLSearchParams({ new_company_id: String(companyId) });
  const res = await fetch(
    `${FIN_METRICS_BASE}/companies_change_requests?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch company change requests (${res.status})`);
  }

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as CompanyChangeRequestSummary[]) : [];
}

export async function getChangeRequestById(
  token: string,
  changeRequestId: number
): Promise<ChangeRequestItem> {
  const res = await fetch(`${FIN_METRICS_BASE}/change_request/${changeRequestId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch change request (${res.status})`);
  }

  return (await res.json()) as ChangeRequestItem;
}

export async function getCompanyByUrl(
  websiteUrl: string
): Promise<CompanyLookupItem | null> {
  const params = new URLSearchParams({ website_url: websiteUrl.trim() });
  const res = await fetch(
    `${COMPANY_LOOKUP_BASE}/get_company_by_url?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch company (${res.status})`);
  }

  const data = (await res.json()) as CompanyLookupItem[];
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] ?? null;
}

// Email builder: images + email content (different API base)
const EMAIL_API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR";

export async function uploadImageToXano(
  token: string,
  file: File
): Promise<string> {
  const fd = new FormData();
  fd.append("img", file, file.name);
  const res = await fetch(`${EMAIL_API_BASE}/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Image upload failed (${res.status})`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const path =
    (json.url as string) ??
    (json.file as { url?: string })?.url ??
    (json.image as { url?: string })?.url ??
    (json.path as string) ??
    (json.file as { path?: string })?.path;
  if (!path || typeof path !== "string") {
    throw new Error("Invalid image upload response");
  }
  if (path.startsWith("/vault/")) {
    return `https://xdil-abvj-o7rq.e2.xano.io${path}`;
  }
  return path;
}

export type EmailTemplateItem = {
  id: number;
  Headline?: string;
  Body?: string;
  Publication_Date?: number | null;
  created_at?: number;
};

export async function getEmailTemplates(
  token: string,
  entityType?: string
): Promise<EmailTemplateItem[]> {
  const params = new URLSearchParams();
  if (entityType) {
    params.set("entity_type", entityType);
  }

  const res = await fetch(
    `${EMAIL_API_BASE}/email_content${params.toString() ? `?${params.toString()}` : ""}`,
    {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch templates (${res.status})`);
  }
  const data = (await res.json()) as EmailTemplateItem[];
  return Array.isArray(data) ? data : [];
}

export async function createEmailContent(
  token: string,
  payload: {
    Headline: string;
    Body: string;
    Publication_Date?: null;
    entity_type?: string;
  }
): Promise<EmailTemplateItem> {
  const res = await fetch(`${EMAIL_API_BASE}/email_content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Publication_Date: payload.Publication_Date ?? null,
      Headline: payload.Headline,
      Body: payload.Body,
      ...(payload.entity_type ? { entity_type: payload.entity_type } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create template (${res.status})`);
  }
  return res.json() as Promise<EmailTemplateItem>;
}

export async function updateEmailContent(
  token: string,
  id: number,
  payload: { Publication_Date?: number | null; Headline: string; Body: string }
): Promise<EmailTemplateItem> {
  const res = await fetch(`${EMAIL_API_BASE}/email_content/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update template (${res.status})`);
  }
  return res.json() as Promise<EmailTemplateItem>;
}

export type CreateCrmEmailPayload = {
  from: string;
  to: string[];
  email_content_id: number;
  new_company_id: number;
  content_ids?: number[];
};

export async function createCrmEmail(
  token: string,
  payload: CreateCrmEmailPayload
): Promise<unknown> {
  const res = await fetch(`${EMAIL_API_BASE}/crm_email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to send CRM email (${res.status})`);
  }
  return res.json();
}

// User emails (searchable list for From/To)
const USER_EMAILS_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI";

export type UserEmailItem = {
  name: string;
  email: string;
};

/** Fetch user emails (GET); optional ?query= for search. */
export async function getUserEmails(
  token: string,
  query: string = ""
): Promise<UserEmailItem[]> {
  const url = new URL(`${USER_EMAILS_BASE}/user_emails`);
  if (query.trim()) url.searchParams.set("query", query.trim());
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch user emails (${res.status})`);
  }
  const data = (await res.json()) as UserEmailItem[];
  if (!Array.isArray(data)) return [];
  const q = query.trim().toLowerCase();
  if (!q) return data;
  return data.filter(
    (u) =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  );
}

/** Xano company profile API (GYQcK4au) — transaction status badge. */
const NEW_COMPANY_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";

export type CompanyTransactionStatusBadge = {
  label?: string;
  date?: string;
  display?: string;
};

/**
 * POST {@link https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/get_company_transaction_status get_company_transaction_status}
 * with `{ new_company_id }`. Returns the badge `label` only (empty if null / missing).
 */
export async function getCompanyTransactionStatusLabel(
  newCompanyId: number,
  token?: string | null
): Promise<string> {
  const url = `${NEW_COMPANY_API_BASE}/get_company_transaction_status`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ new_company_id: newCompanyId }),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as {
    transaction_status_badge?: CompanyTransactionStatusBadge | null;
  };
  const badge = data?.transaction_status_badge;
  if (badge == null || typeof badge !== "object") return "";
  const label = badge.label;
  return typeof label === "string" ? label.trim() : "";
}
