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

export async function fetchXanoDcpCompanies(
  token: string,
  options: {
    outreachSequenceIds?: number[];
    companyIds?: number[];
  } = {}
): Promise<XanoDcpCompaniesResponse | null> {
  const params = new URLSearchParams();
  const outreachIds = (options.outreachSequenceIds ?? []).filter((id) => id > 0);
  const companyIds = (options.companyIds ?? []).filter((id) => id > 0);

  if (outreachIds.length > 0) {
    params.set("ids", outreachIds.join(","));
  }
  if (companyIds.length > 0) {
    params.set("company_ids", companyIds.join(","));
  }

  const qs = params.toString();
  const url = `${getXanoDcpCompaniesUrl()}${qs ? `?${qs}` : ""}`;

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
    contributions_count:
      xano.contributions_count || dcpNum(row.contributions_count),
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

function buildXanoLookups(companies: XanoDcpCompany[]): {
  byOutreachSequenceId: Map<number, XanoDcpCompany>;
  byCompanyId: Map<number, XanoDcpCompany>;
} {
  const byOutreachSequenceId = new Map<number, XanoDcpCompany>();
  const byCompanyId = new Map<number, XanoDcpCompany>();

  for (const company of companies) {
    if (company.outreach_sequence_id > 0) {
      byOutreachSequenceId.set(company.outreach_sequence_id, company);
    }
    if (company.company_id > 0) {
      byCompanyId.set(company.company_id, company);
    }
  }

  return { byOutreachSequenceId, byCompanyId };
}

function findXanoCompany(
  row: Record<string, unknown>,
  lookups: ReturnType<typeof buildXanoLookups>
): XanoDcpCompany | undefined {
  const outreachSequenceId = dcpNum(
    row.outreach_sequence_id ?? row.outreachSequenceId ?? row.id
  );
  const companyId = dcpNum(row.company_id);

  return (
    (outreachSequenceId > 0
      ? lookups.byOutreachSequenceId.get(outreachSequenceId)
      : undefined) ??
    (companyId > 0 ? lookups.byCompanyId.get(companyId) : undefined)
  );
}

function extractCompanyIds(data: unknown): {
  outreachSequenceIds: number[];
  companyIds: number[];
} {
  if (!isRecord(data)) {
    return { outreachSequenceIds: [], companyIds: [] };
  }

  const rows = Array.isArray(data.companies)
    ? data.companies
    : isRecord(data.company)
    ? [data.company]
    : [data];

  const outreachSequenceIds = new Set<number>();
  const companyIds = new Set<number>();

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const outreachSequenceId = dcpNum(
      row.outreach_sequence_id ?? row.outreachSequenceId ?? row.id
    );
    const companyId = dcpNum(row.company_id);
    if (outreachSequenceId > 0) outreachSequenceIds.add(outreachSequenceId);
    if (companyId > 0) companyIds.add(companyId);
  }

  return {
    outreachSequenceIds: Array.from(outreachSequenceIds),
    companyIds: Array.from(companyIds),
  };
}

export async function enrichDcpAnalyticsResponse(
  token: string,
  data: unknown
): Promise<unknown> {
  if (!isRecord(data)) return data;

  const { outreachSequenceIds, companyIds } = extractCompanyIds(data);
  let xano = await fetchXanoDcpCompanies(token, {
    outreachSequenceIds,
    companyIds,
  });

  if (
    xano &&
    xano.companies.length === 0 &&
    (outreachSequenceIds.length > 0 || companyIds.length > 0)
  ) {
    xano = await fetchXanoDcpCompanies(token, {});
  }

  if (!xano) return data;

  const lookups = buildXanoLookups(xano.companies);
  const enriched: Record<string, unknown> = { ...data };

  if (Array.isArray(data.companies)) {
    enriched.companies = data.companies.map((row) =>
      isRecord(row) ? mergeCompanyRow(row, findXanoCompany(row, lookups)) : row
    );
  }

  if (isRecord(data.company)) {
    enriched.company = mergeCompanyRow(
      data.company,
      findXanoCompany(data.company, lookups)
    );
  } else if (dcpNum(data.outreach_sequence_id ?? data.company_id) > 0) {
    return mergeCompanyRow(data, findXanoCompany(data, lookups));
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
    companies_matched: xano.companies.length,
    summary: xano.summary,
  };

  return enriched;
}
