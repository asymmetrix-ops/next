import { andFiltersSql } from "@/lib/companiesFilterPayload";

export type InvestmentStatusFilter = "all" | "current" | "past";

export type PortfolioIdSets = {
  all_ids: number[];
  current_ids: number[];
  past_ids: number[];
};

/** Safe id-array → SQL fragment. Empty arrays match nothing without invalid SQL. */
export function idsToSqlFragment(ids: number[] | null | undefined): string {
  if (!ids?.length) return "FALSE";
  return `nc.id IN (${ids.join(",")})`;
}

export function getScopedPortfolioIds(
  filter: InvestmentStatusFilter,
  portfolioIds: PortfolioIdSets
): number[] {
  if (filter === "current") return portfolioIds.current_ids;
  if (filter === "past") return portfolioIds.past_ids;
  return portfolioIds.all_ids;
}

export function buildCombinedPortfolioFiltersSql(
  investmentStatusFilter: InvestmentStatusFilter,
  portfolioIds: PortfolioIdSets,
  userFiltersSql?: string | null
): string {
  const scopedIds = getScopedPortfolioIds(investmentStatusFilter, portfolioIds);
  const portfolioClause = idsToSqlFragment(scopedIds);
  const trimmedUserSql = userFiltersSql?.trim();
  if (trimmedUserSql) {
    return `${portfolioClause} AND (${trimmedUserSql})`;
  }
  return portfolioClause;
}

/** @deprecated Use idsToSqlFragment */
export function buildPortfolioBaseFiltersSql(allIds: number[]): string {
  return idsToSqlFragment(allIds);
}

/** Extra columns requested on Get_new_companies for the Portfolio tab's holding-period fields. */
export const HOLDING_PERIOD_REQUEST_COLUMNS = [
  "holding_period_display",
  "holding_period_status",
  "holding_days",
  "acquisition_date",
  "headcount_growth_pct",
  "revenue_growth_pct",
] as const;

/** UI column `investment_status` is not a Get_new_companies `columns[]` key. */
function remapPortfolioApiColumns(columns: string[] | undefined): string[] {
  const remapped = (columns ?? []).map((column) =>
    column === "investment_status" ? "holding_period_status" : column
  );
  return Array.from(new Set([...remapped, ...HOLDING_PERIOD_REQUEST_COLUMNS]));
}

export function enrichPortfolioListFilters<
  T extends { filters_sql?: string | null; columns?: string[] },
>(
  userFilters: T,
  scopedIds: number[],
  currentIds: number[],
  investorId?: number | string | null
): T & {
  filters_sql: string | null;
  portfolio_mode: true;
  current_portfolio_ids: number[];
  investor_id?: number | null;
  columns: string[];
} {
  const numericInvestorId =
    investorId != null && investorId !== "" ? Number(investorId) : null;
  const withHoldingPeriodColumns = remapPortfolioApiColumns(userFilters.columns);

  if ((userFilters as { portfolio_mode?: boolean }).portfolio_mode) {
    return {
      ...userFilters,
      columns: withHoldingPeriodColumns,
      investor_id:
        Number.isFinite(numericInvestorId) && numericInvestorId
          ? numericInvestorId
          : (userFilters as { investor_id?: number | null }).investor_id ?? null,
    } as T & {
      filters_sql: string | null;
      portfolio_mode: true;
      current_portfolio_ids: number[];
      investor_id?: number | null;
      columns: string[];
    };
  }

  return {
    ...userFilters,
    filters_sql: andFiltersSql(
      idsToSqlFragment(scopedIds),
      userFilters.filters_sql
    ),
    portfolio_mode: true,
    current_portfolio_ids: currentIds,
    investor_id:
      Number.isFinite(numericInvestorId) && numericInvestorId
        ? numericInvestorId
        : null,
    columns: withHoldingPeriodColumns,
  };
}
