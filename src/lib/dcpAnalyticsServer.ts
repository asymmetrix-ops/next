const DEFAULT_XANO_DCP_COMPANIES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/analytics/dcp/companies";

export type XanoDcpCompany = {
  outreach_sequence_id: number;
  company_id: number;
  company_name: string;
  website: string;
  ceo_email: string;
  key_contact_email: string;
  outreach_status: string;
  contributed: boolean;
  contribution_approved: boolean;
  contributions_count: number;
  last_contribution_at: number | null;
  contribution_entity_types: string[];
  contribution_source: string;
  inactive: boolean;
  content_id: number | null;
};

export type XanoDcpCompaniesResponse = {
  summary: {
    total: number;
    contributed: number;
    approved: number;
    inactive: number;
  };
  companies: XanoDcpCompany[];
};

function dcpNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dcpOptionalTs(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function getXanoDcpCompaniesUrl(): string {
  return (
    process.env.XANO_DCP_COMPANIES_URL?.trim() || DEFAULT_XANO_DCP_COMPANIES_URL
  );
}

function normalizeXanoCompany(row: unknown): XanoDcpCompany | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const outreachSequenceId = dcpNum(
    r.outreach_sequence_id ?? r.outreachSequenceId ?? r.id ?? r.contact_id
  );
  const companyId = dcpNum(r.company_id);
  if (outreachSequenceId <= 0 && companyId <= 0) return null;

  const entityTypesRaw = r.contribution_entity_types;
  const contributionEntityTypes = Array.isArray(entityTypesRaw)
    ? entityTypesRaw.map((value) => String(value)).filter(Boolean)
    : [];

  return {
    outreach_sequence_id: outreachSequenceId,
    company_id: companyId,
    company_name: String(r.company_name ?? r.name ?? ""),
    website: String(r.website ?? r.company_url ?? ""),
    ceo_email: String(r.ceo_email ?? ""),
    key_contact_email: String(r.key_contact_email ?? ""),
    outreach_status: String(r.outreach_status ?? ""),
    contributed: Boolean(r.contributed),
    contribution_approved: Boolean(r.contribution_approved),
    contributions_count: dcpNum(r.contributions_count),
    last_contribution_at: dcpOptionalTs(r.last_contribution_at),
    contribution_entity_types: contributionEntityTypes,
    contribution_source: String(r.contribution_source ?? ""),
    inactive: Boolean(r.inactive),
    content_id:
      r.content_id == null || r.content_id === ""
        ? null
        : dcpNum(r.content_id) || null,
  };
}

async function fetchXanoDcpCompaniesUrl(url: string, token: string) {
  let resp = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (resp.status === 401) {
    resp = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      cache: "no-store",
    });
  }

  return resp;
}

/** Fetch the full DCP company catalog from Xano (same as ids=null&company_ids=null). */
export async function fetchAllXanoDcpCompanies(
  token: string
): Promise<XanoDcpCompaniesResponse | null> {
  const params = new URLSearchParams({
    ids: "null",
    company_ids: "null",
  });
  const url = `${getXanoDcpCompaniesUrl()}?${params.toString()}`;
  const resp = await fetchXanoDcpCompaniesUrl(url, token);
  if (!resp.ok) return null;

  const json = (await resp.json().catch(() => null)) as
    | Record<string, unknown>
    | XanoDcpCompany[]
    | null;
  if (!json) return null;

  const root = Array.isArray(json) ? { companies: json } : json;
  const summaryRaw =
    root.summary && typeof root.summary === "object"
      ? (root.summary as Record<string, unknown>)
      : {};
  const companiesRaw = root.companies ?? root.items ?? root.results ?? [];

  const companies = (Array.isArray(companiesRaw) ? companiesRaw : [])
    .map(normalizeXanoCompany)
    .filter((company): company is XanoDcpCompany => company !== null);

  return {
    summary: {
      total: dcpNum(summaryRaw.total ?? companies.length),
      contributed: dcpNum(summaryRaw.contributed),
      approved: dcpNum(summaryRaw.approved),
      inactive: dcpNum(summaryRaw.inactive),
    },
    companies,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function mergeCompanyRow(
  row: Record<string, unknown>,
  xano: XanoDcpCompany | undefined
): Record<string, unknown> {
  if (!xano) return row;

  return {
    ...row,
    outreach_sequence_id:
      dcpNum(row.outreach_sequence_id) || xano.outreach_sequence_id,
    company_id: dcpNum(row.company_id) || xano.company_id,
    company_name: xano.company_name || row.company_name || row.name || "",
    company_url: xano.website || row.company_url || row.website || "",
    website: xano.website || row.website || row.company_url || "",
    ceo_email: xano.ceo_email || row.ceo_email || "",
    key_contact_email: xano.key_contact_email || row.key_contact_email || "",
    outreach_status: xano.outreach_status || row.outreach_status || "",
    contributed: xano.contributed || Boolean(row.contributed),
    contribution_approved:
      xano.contribution_approved || Boolean(row.contribution_approved),
    contributions_count: Math.max(
      xano.contributions_count,
      dcpNum(row.contributions_count)
    ),
    last_contribution_at:
      xano.last_contribution_at ?? row.last_contribution_at ?? null,
    contribution_entity_types:
      xano.contribution_entity_types.length > 0
        ? xano.contribution_entity_types
        : row.contribution_entity_types ?? [],
    contribution_source: xano.contribution_source || row.contribution_source || "",
    inactive: xano.inactive || Boolean(row.inactive),
    content_id: xano.content_id ?? row.content_id ?? null,
  };
}

type XanoLookups = {
  byOutreachSequenceId: Map<number, XanoDcpCompany>;
  byCompanyId: Map<number, XanoDcpCompany>;
  byEmail: Map<string, XanoDcpCompany>;
};

function buildXanoLookups(companies: XanoDcpCompany[]): XanoLookups {
  const byOutreachSequenceId = new Map<number, XanoDcpCompany>();
  const byCompanyId = new Map<number, XanoDcpCompany>();
  const byEmail = new Map<string, XanoDcpCompany>();

  for (const company of companies) {
    if (company.outreach_sequence_id > 0) {
      byOutreachSequenceId.set(company.outreach_sequence_id, company);
    }
    if (company.company_id > 0) {
      byCompanyId.set(company.company_id, company);
    }
    for (const email of [company.ceo_email, company.key_contact_email]) {
      const normalized = normalizeEmail(email);
      if (normalized) byEmail.set(normalized, company);
    }
  }

  return { byOutreachSequenceId, byCompanyId, byEmail };
}

function extractTursoEmails(row: Record<string, unknown>): string[] {
  const emails = new Set<string>();

  for (const key of [
    "ceo_email",
    "recipient_email",
    "key_contact_email",
    "email",
  ]) {
    const normalized = normalizeEmail(row[key]);
    if (normalized) emails.add(normalized);
  }

  const roundsRaw = row.rounds ?? row.round_history ?? row.roundHistory;
  let rounds: unknown = roundsRaw;
  if (typeof rounds === "string" && rounds.trim()) {
    try {
      rounds = JSON.parse(rounds) as unknown;
    } catch {
      rounds = null;
    }
  }

  if (Array.isArray(rounds)) {
    for (const entry of rounds) {
      if (!isRecord(entry)) continue;
      const normalized = normalizeEmail(entry.recipient_email ?? entry.recipient);
      if (normalized) emails.add(normalized);
    }
  } else if (isRecord(rounds)) {
    for (const entry of Object.values(rounds)) {
      if (!isRecord(entry)) continue;
      const normalized = normalizeEmail(entry.recipient_email ?? entry.recipient);
      if (normalized) emails.add(normalized);
    }
  }

  return Array.from(emails);
}

function findXanoCompany(
  row: Record<string, unknown>,
  lookups: XanoLookups
): XanoDcpCompany | undefined {
  const outreachSequenceId = dcpNum(
    row.outreach_sequence_id ?? row.outreachSequenceId ?? row.id
  );
  const companyId = dcpNum(row.company_id);

  const byId =
    (outreachSequenceId > 0
      ? lookups.byOutreachSequenceId.get(outreachSequenceId)
      : undefined) ??
    (companyId > 0 ? lookups.byCompanyId.get(companyId) : undefined);

  if (byId) return byId;

  for (const email of extractTursoEmails(row)) {
    const match = lookups.byEmail.get(email);
    if (match) return match;
  }

  return undefined;
}

export async function enrichDcpAnalyticsResponse(
  token: string,
  data: unknown
): Promise<unknown> {
  if (!isRecord(data)) return data;

  const xano = await fetchAllXanoDcpCompanies(token);
  if (!xano) {
    return {
      ...data,
      xano_enrichment: {
        ok: false,
        error: "Failed to fetch Xano DCP companies",
      },
    };
  }

  const lookups = buildXanoLookups(xano.companies);
  const enriched: Record<string, unknown> = { ...data };
  let rowsMerged = 0;

  if (Array.isArray(data.companies)) {
    enriched.companies = data.companies.map((row) => {
      if (!isRecord(row)) return row;
      const xanoCompany = findXanoCompany(row, lookups);
      if (xanoCompany) rowsMerged += 1;
      return mergeCompanyRow(row, xanoCompany);
    });
  }

  if (isRecord(data.company)) {
    const xanoCompany = findXanoCompany(data.company, lookups);
    if (xanoCompany) rowsMerged += 1;
    enriched.company = mergeCompanyRow(data.company, xanoCompany);
  } else if (dcpNum(data.outreach_sequence_id ?? data.company_id) > 0) {
    const xanoCompany = findXanoCompany(data, lookups);
    if (xanoCompany) rowsMerged += 1;
    return {
      ...mergeCompanyRow(data, xanoCompany),
      xano_enrichment: {
        ok: true,
        companies_fetched: xano.companies.length,
        rows_merged: xanoCompany ? 1 : 0,
        summary: xano.summary,
      },
    };
  }

  const summary = isRecord(data.summary) ? { ...data.summary } : {};
  const companiesEmailed = dcpNum(
    summary.companies_emailed ?? summary.companies_total ?? xano.summary.total
  );
  const contributed = Math.max(
    dcpNum(summary.contributed_data ?? summary.contributed),
    xano.summary.contributed
  );

  enriched.summary = {
    ...summary,
    contributed_data: contributed,
    contributed_approved: Math.max(
      dcpNum(summary.contributed_approved ?? summary.approved),
      xano.summary.approved
    ),
    contribution_rate:
      dcpNum(summary.contribution_rate) ||
      (companiesEmailed > 0 ? (contributed / companiesEmailed) * 100 : 0),
    outreach_sent_no_data: Math.max(0, companiesEmailed - contributed),
    xano_summary: xano.summary,
  };

  enriched.xano_enrichment = {
    ok: true,
    companies_fetched: xano.companies.length,
    rows_merged: rowsMerged,
    summary: xano.summary,
  };

  return enriched;
}
