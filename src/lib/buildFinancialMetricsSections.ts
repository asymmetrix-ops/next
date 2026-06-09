type FinancialMetricsPayload = {
  Revenue_m?: number | null;
  Revenue_source_label?: string | null;
  Rev_source?: number | string | null;
  EBITDA_m?: number | null;
  EBITDA_source_label?: string | null;
  EBITDA_source?: number | string | null;
  EV?: number | null;
  EV_source_label?: string | null;
  EV_source?: number | string | null;
  Revenue_multiple?: number | null;
  Revenue_multiple_source_label?: string | null;
  Rev_x_source?: number | string | null;
  Rev_Growth_PC?: number | null;
  Rev_growth_source_label?: string | null;
  Rev_Growth_source?: number | string | null;
  EBITDA_margin?: number | null;
  EBITDA_margin_source_label?: string | null;
  EBITDA_margin_source?: number | string | null;
  Rule_of_40?: number | string | null;
  Rule_of_40_source_label?: string | null;
  Rule_of_40_source?: number | string | null;
  ARR_pc?: number | null;
  ARR_m?: number | null;
  ARR_source_label?: string | null;
  ARR_source?: number | string | null;
  Churn_pc?: number | null;
  Churn_source_label?: string | null;
  Churn_Source?: number | string | null;
  GRR_pc?: number | null;
  GRR_source_label?: string | null;
  GRR_source?: number | string | null;
  Upsell_pc?: number | null;
  Upsell_source_label?: string | null;
  Upsell_source?: number | string | null;
  Cross_sell_pc?: number | null;
  Cross_sell_source_label?: string | null;
  Cross_sell_source?: number | string | null;
  Price_increase_pc?: number | null;
  Price_increase_source_label?: string | null;
  Price_increase_source?: number | string | null;
  Rev_expansion_pc?: number | null;
  Rev_expansion_source_label?: string | null;
  Rev_expansion_source?: number | string | null;
  NRR?: number | string | null;
  NRR_source_label?: string | null;
  NRR_source?: number | string | null;
  New_client_growth_pc?: number | null;
  New_client_growth_source_label?: string | null;
  New_Client_Growth_Source?: number | string | null;
  EBIT_m?: number | null;
  EBIT_source_label?: string | null;
  EBIT_source?: number | string | null;
  No_of_Clients?: number | null;
  No_of_Clients_source_label?: string | null;
  No_Clients_source?: number | string | null;
  Rev_per_client?: number | null;
  Rev_per_client_source_label?: string | null;
  Rev_per_client_source?: number | string | null;
  No_Employees?: number | null;
  No_Employees_source_label?: string | null;
  No_Employees_source?: number | string | null;
  Revenue_per_employee?: number | null;
  Revenue_per_employee_source_label?: string | null;
  Rev_per_employee_source?: number | string | null;
};

export type FinancialMetricRow = {
  label: string;
  value: string;
  source: string;
};

export type FinancialMetricSection = {
  title?: string;
  periodDisplay?: string;
  rows: FinancialMetricRow[];
};

export type FinancialMetricsCardData = {
  primary: FinancialMetricSection;
  subscription: FinancialMetricSection;
  other: FinancialMetricSection;
};

type SourceResolver = (
  label?: string | null,
  code?: number | string | null
) => string;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
};

function normalizeCurrencyCode(raw: string): string {
  const trimmed = raw.trim();
  const compact = trimmed.replace(/\s/g, "").toUpperCase();
  if (compact === "US$" || compact === "US" || compact === "U.S.$" || compact === "USD") {
    return "USD";
  }
  return trimmed.toUpperCase();
}

/** Strip legacy "US$" prefixes from API/display strings. */
function stripLegacyUsPrefix(value: string): string {
  return value.replace(/US\$\s*/gi, "$");
}

/** Prefixes a formatted metric value with the currency symbol/code when available. */
export function appendMetricCurrency(
  formatted: string,
  currencyCode?: string
): string {
  const value = stripLegacyUsPrefix(formatted.trim());
  if (value === "-") return value;
  if (!currencyCode) return value;

  const code = normalizeCurrencyCode(currencyCode);
  const sym = CURRENCY_SYMBOLS[code];
  if (sym) {
    if (value.startsWith(sym)) return value;
    return `${sym}${value}`;
  }
  return `${value} ${code}`;
}

type BuildSectionsInput = {
  financialMetrics: FinancialMetricsPayload | null;
  hasIncomeStatementData: boolean;
  revenuePlain: string;
  ebitdaPlain: string;
  evPlain: string;
  currentEmployeeCount: number;
  currencyCode?: string;
  getSourceText: SourceResolver;
  formatPercent: (value?: number | string | null) => string;
  formatMultiple: (value?: number | string | null) => string;
  formatPlainNumber: (value?: number | string | null) => string;
  formatWholeNumber: (value?: number | string | null) => string;
  getNumeric: (value?: number | string | null) => number | undefined;
  periodDisplay?: string;
};

function row(
  label: string,
  value: string,
  source: string
): FinancialMetricRow {
  return { label, value, source };
}

/** Assembles PROD-style financial metric sections for the two tabbed cards. */
export function buildFinancialMetricsSections({
  financialMetrics,
  hasIncomeStatementData,
  revenuePlain,
  ebitdaPlain,
  evPlain,
  currentEmployeeCount,
  getSourceText,
  formatPercent,
  formatMultiple,
  formatPlainNumber,
  formatWholeNumber,
  getNumeric,
  periodDisplay,
  currencyCode,
}: BuildSectionsInput): FinancialMetricsCardData {
  const fm = financialMetrics;
  const src = getSourceText;
  const money = (formatted: string) => appendMetricCurrency(formatted, currencyCode);

  const mainRows: FinancialMetricRow[] = [];

  if (!hasIncomeStatementData) {
    mainRows.push(
      row(
        "Revenue (m):",
        money(revenuePlain),
        src(fm?.Revenue_source_label, fm?.Rev_source)
      ),
      row(
        "EBITDA (m):",
        money(ebitdaPlain),
        src(fm?.EBITDA_source_label, fm?.EBITDA_source)
      )
    );
  }

  mainRows.push(
    row(
      "Enterprise Value (m):",
      money(evPlain),
      src(fm?.EV_source_label, fm?.EV_source)
    ),
    row(
      "Revenue multiple:",
      formatMultiple(fm?.Revenue_multiple),
      src(fm?.Revenue_multiple_source_label, fm?.Rev_x_source)
    ),
    row(
      "Revenue Growth:",
      formatPercent(fm?.Rev_Growth_PC),
      src(fm?.Rev_growth_source_label, fm?.Rev_Growth_source)
    ),
    row(
      "EBITDA margin:",
      formatPercent(fm?.EBITDA_margin),
      src(fm?.EBITDA_margin_source_label, fm?.EBITDA_margin_source)
    ),
    row(
      "Rule of 40:",
      (() => {
        const n = getNumeric(fm?.Rule_of_40);
        return n !== undefined
          ? Math.round(n).toLocaleString()
          : "-";
      })(),
      src(fm?.Rule_of_40_source_label, fm?.Rule_of_40_source)
    )
  );

  const subscriptionRows: FinancialMetricRow[] = [
    row(
      "Recurring Revenue:",
      formatPercent(fm?.ARR_pc),
      src(fm?.ARR_source_label, fm?.ARR_source)
    ),
    row(
      "ARR (m):",
      money(formatPlainNumber(fm?.ARR_m)),
      src(fm?.ARR_source_label, fm?.ARR_source)
    ),
    row(
      "Churn:",
      formatPercent(fm?.Churn_pc),
      src(fm?.Churn_source_label, fm?.Churn_Source)
    ),
    row(
      "GRR:",
      formatPercent(fm?.GRR_pc),
      src(fm?.GRR_source_label, fm?.GRR_source)
    ),
    row(
      "Upsell:",
      formatPercent(fm?.Upsell_pc),
      src(fm?.Upsell_source_label, fm?.Upsell_source)
    ),
    row(
      "Cross-sell:",
      formatPercent(fm?.Cross_sell_pc),
      src(fm?.Cross_sell_source_label, fm?.Cross_sell_source)
    ),
    row(
      "Price increase:",
      formatPercent(fm?.Price_increase_pc),
      src(fm?.Price_increase_source_label, fm?.Price_increase_source)
    ),
    row(
      "Revenue expansion:",
      formatPercent(fm?.Rev_expansion_pc),
      src(fm?.Rev_expansion_source_label, fm?.Rev_expansion_source)
    ),
    row(
      "NRR:",
      formatPercent(fm?.NRR),
      src(fm?.NRR_source_label, fm?.NRR_source)
    ),
    row(
      "New clients revenue growth:",
      formatPercent(fm?.New_client_growth_pc),
      src(fm?.New_client_growth_source_label, fm?.New_Client_Growth_Source)
    ),
  ];

  const otherRows: FinancialMetricRow[] = [
    row(
      "EBIT (m):",
      money(formatPlainNumber(fm?.EBIT_m)),
      src(fm?.EBIT_source_label, fm?.EBIT_source)
    ),
    row(
      "Number of clients:",
      typeof fm?.No_of_Clients === "number"
        ? fm.No_of_Clients.toLocaleString()
        : "-",
      src(fm?.No_of_Clients_source_label, fm?.No_Clients_source)
    ),
    row(
      "Revenue per client:",
      money(formatWholeNumber(fm?.Rev_per_client)),
      src(fm?.Rev_per_client_source_label, fm?.Rev_per_client_source)
    ),
    row(
      "Number of employees:",
      typeof fm?.No_Employees === "number"
        ? fm.No_Employees.toLocaleString()
        : currentEmployeeCount.toLocaleString(),
      src(fm?.No_Employees_source_label, fm?.No_Employees_source)
    ),
    row(
      "Revenue per employee:",
      money(formatWholeNumber(fm?.Revenue_per_employee)),
      src(fm?.Revenue_per_employee_source_label, fm?.Rev_per_employee_source)
    ),
  ];

  return {
    primary: { periodDisplay, rows: mainRows },
    subscription: { periodDisplay, rows: subscriptionRows },
    other: { periodDisplay, rows: otherRows },
  };
}
