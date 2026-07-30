import type { IncomeStatementApiEntry } from "@/lib/incomeStatement";
import type { CompanyFinancialMetricsCardRow } from "@/lib/companyFinancialMetricsCard";
import { resolveFinancialMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";

const API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/company_financials_card";

type CardMetricValue = {
  value?: number | string | null;
  unit?: string | null;
  currency_code?: string | null;
  currency_symbol?: string | null;
  source_label?: string | null;
  color?: string | null;
};

type CardMetric = {
  key: string;
  label?: string;
  unit?: string;
  values?: Record<string, CardMetricValue>;
};

export type CompanyIncomeStatementCardResponse = {
  years?: number[];
  data_source_legend?: Array<{ key: string; label: string; color: string }>;
  financial_metrics?: CardMetric[];
  subscription_metrics?: CardMetric[];
  other_metrics?: CardMetric[];
  income_statement?: IncomeStatementApiEntry[];
};

export type CompanyIncomeStatementCardResult = {
  incomeStatementRows: IncomeStatementApiEntry[];
  financialMetricsRows: CompanyFinancialMetricsCardRow[];
};

type MetricFieldMapping = {
  value: keyof CompanyFinancialMetricsCardRow;
  source: keyof CompanyFinancialMetricsCardRow;
  currency?: keyof CompanyFinancialMetricsCardRow;
};

const METRIC_FIELD_MAP: Record<string, MetricFieldMapping> = {
  revenue: {
    value: "Revenue_m",
    source: "Revenue_source_label",
    currency: "Revenue_currency_display",
  },
  ebitda: {
    value: "EBITDA_m",
    source: "EBITDA_source_label",
    currency: "EBITDA_currency_display",
  },
  rev_growth: {
    value: "Rev_Growth_PC",
    source: "Rev_growth_source_label",
  },
  ebitda_margin: {
    value: "EBITDA_margin",
    source: "EBITDA_margin_source_label",
  },
  rule_of_40: {
    value: "Rule_of_40",
    source: "Rule_of_40_source_label",
  },
  ev: {
    value: "EV",
    source: "EV_source_label",
    currency: "EV_currency_display",
  },
  revenue_multiple: {
    value: "Revenue_multiple",
    source: "Revenue_multiple_source_label",
  },
  subscription_revenue_m: {
    value: "Subscription_revenue_m",
    source: "Subscription_revenue_source_label",
    currency: "Subscription_revenue_currency_display",
  },
  subscription_revenue_pc: {
    value: "Subscription_revenue_pc",
    source: "Subscription_revenue_source_label",
  },
  churn: {
    value: "Churn_pc",
    source: "Churn_source_label",
  },
  grr: {
    value: "GRR_pc",
    source: "GRR_source_label",
  },
  nrr: {
    value: "NRR",
    source: "NRR_source_label",
  },
  new_client_growth: {
    value: "New_client_growth_pc",
    source: "New_client_growth_source_label",
  },
  upsell: {
    value: "Upsell_pc",
    source: "Upsell_source_label",
  },
  cross_sell: {
    value: "Cross_sell_pc",
    source: "Cross_sell_source_label",
  },
  price_increase: {
    value: "Price_increase_pc",
    source: "Price_increase_source_label",
  },
  rev_expansion: {
    value: "Rev_expansion_pc",
    source: "Rev_expansion_source_label",
  },
  ebit: {
    value: "EBIT_m",
    source: "EBIT_source_label",
    currency: "EBIT_currency_display",
  },
  no_of_clients: {
    value: "No_of_Clients",
    source: "No_of_Clients_source_label",
  },
  rev_per_client: {
    value: "Rev_per_client",
    source: "Rev_per_client_source_label",
    currency: "Revenue_currency_display",
  },
  no_employees: {
    value: "No_Employees",
    source: "No_Employees_source_label",
  },
  rev_per_employee: {
    value: "Revenue_per_employee",
    source: "Revenue_per_employee_source_label",
    currency: "Revenue_currency_display",
  },
};

function isCardResponse(data: unknown): data is CompanyIncomeStatementCardResponse {
  if (typeof data !== "object" || data == null) return false;
  const candidate = data as CompanyIncomeStatementCardResponse;
  if (Array.isArray(candidate.income_statement) && candidate.income_statement.length > 0) {
    return true;
  }
  return (
    Array.isArray(candidate.years) &&
    (Array.isArray(candidate.financial_metrics) ||
      Array.isArray(candidate.subscription_metrics) ||
      Array.isArray(candidate.other_metrics))
  );
}

function mapCardIncomeStatementEntry(
  entry: IncomeStatementApiEntry & { currency?: string | null }
): IncomeStatementApiEntry {
  return {
    ...entry,
    statement_currency: entry.statement_currency ?? entry.currency ?? null,
  };
}

function resolveCellCurrency(cell: CardMetricValue): string | null {
  const code = cell.currency_code?.trim();
  if (code) return code;

  const symbol = cell.currency_symbol?.trim();
  if (symbol === "$") return "USD";
  if (symbol === "£") return "GBP";
  if (symbol === "€") return "EUR";
  if (symbol === "¥") return "JPY";

  return null;
}

function applyCurrencyFallbacks(row: CompanyFinancialMetricsCardRow): void {
  const primaryCurrency = [
    row.Revenue_currency_display,
    row.EBITDA_currency_display,
    row.EV_currency_display,
    row.EBIT_currency_display,
  ]
    .map((value) => value?.trim())
    .find((value) => value && value !== "0" && !/^\d+$/.test(value));

  if (!primaryCurrency) return;

  if (
    row.Subscription_revenue_m != null &&
    !row.Subscription_revenue_currency_display?.trim()
  ) {
    row.Subscription_revenue_currency_display = primaryCurrency;
  }
}

function resolveCardCellSourceLabel(cell: CardMetricValue): string | null {
  const resolved = resolveFinancialMetricSourceType(
    cell.source_label,
    undefined,
    cell.color
  );
  if (resolved) return resolved;
  return cell.source_label?.trim() || null;
}

function applyMetricToRow(
  row: CompanyFinancialMetricsCardRow,
  metric: CardMetric,
  year: number
): void {
  const mapping = METRIC_FIELD_MAP[metric.key];
  if (!mapping) return;

  const cell = metric.values?.[String(year)];
  if (!cell || cell.value == null || cell.value === "") return;

  (row[mapping.value] as CompanyFinancialMetricsCardRow[typeof mapping.value]) =
    cell.value;
  (row[mapping.source] as CompanyFinancialMetricsCardRow[typeof mapping.source]) =
    resolveCardCellSourceLabel(cell);
  if (mapping.currency) {
    const currency = resolveCellCurrency(cell);
    if (currency) {
      (row[mapping.currency] as CompanyFinancialMetricsCardRow[typeof mapping.currency]) =
        currency;
    }
  }
}

/** Converts the card-style API payload into per-year financial metrics rows. */
export function parseCompanyIncomeStatementCardResponse(
  data: CompanyIncomeStatementCardResponse,
  companyId: number
): CompanyFinancialMetricsCardRow[] {
  const years = data.years ?? [];
  const allMetrics = [
    ...(data.financial_metrics ?? []),
    ...(data.subscription_metrics ?? []),
    ...(data.other_metrics ?? []),
  ];

  return years.map((year, index) => {
    const row: CompanyFinancialMetricsCardRow = {
      id: index,
      new_company_id: companyId,
      financial_year_int: year,
      financial_year_text: String(year),
    };

    for (const metric of allMetrics) {
      applyMetricToRow(row, metric, year);
    }

    applyCurrencyFallbacks(row);

    return row;
  });
}

/** GET-only — endpoint does not support POST. Requires `new_company_id` query param. */
export async function fetchCompanyIncomeStatementCard(
  companyId: string | number
): Promise<CompanyIncomeStatementCardResult> {
  const empty: CompanyIncomeStatementCardResult = {
    incomeStatementRows: [],
    financialMetricsRows: [],
  };

  const numericId = Number(companyId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return empty;
  }

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const params = new URLSearchParams();
  params.set("new_company_id", String(numericId));

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) return empty;

  const data: unknown = await res.json();

  if (Array.isArray(data)) {
    return {
      incomeStatementRows: data as IncomeStatementApiEntry[],
      financialMetricsRows: [],
    };
  }

  if (isCardResponse(data)) {
    const card = data as CompanyIncomeStatementCardResponse;
    const incomeStatementRows = Array.isArray(card.income_statement)
      ? card.income_statement.map((entry) =>
          mapCardIncomeStatementEntry(
            entry as IncomeStatementApiEntry & { currency?: string | null }
          )
        )
      : [];

    return {
      incomeStatementRows,
      financialMetricsRows: parseCompanyIncomeStatementCardResponse(card, numericId),
    };
  }

  return empty;
}
