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

export function enrichPortfolioListFilters<T extends { filters_sql?: string | null }>(
  userFilters: T,
  scopedIds: number[],
  currentIds: number[]
): T & {
  filters_sql: string | null;
  portfolio_mode: true;
  current_portfolio_ids: number[];
} {
  if ((userFilters as { portfolio_mode?: boolean }).portfolio_mode) {
    return userFilters as T & {
      filters_sql: string | null;
      portfolio_mode: true;
      current_portfolio_ids: number[];
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
  };
}
