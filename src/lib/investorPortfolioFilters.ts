import { andFiltersSql } from "@/lib/companiesFilterPayload";

export function buildPortfolioBaseFiltersSql(allIds: number[]): string {
  if (allIds.length === 0) return "nc.id IN (-1)";
  return `nc.id IN (${allIds.join(",")})`;
}

export function enrichPortfolioListFilters<T extends { filters_sql?: string | null }>(
  userFilters: T,
  allIds: number[],
  currentIds: number[]
): T & {
  filters_sql: string | null;
  portfolio_mode: true;
  current_portfolio_ids: number[];
} {
  return {
    ...userFilters,
    filters_sql: andFiltersSql(
      buildPortfolioBaseFiltersSql(allIds),
      userFilters.filters_sql
    ),
    portfolio_mode: true,
    current_portfolio_ids: currentIds,
  };
}
