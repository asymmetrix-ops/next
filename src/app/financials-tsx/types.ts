// Asymmetrix Financials — shared TypeScript types

export type Ownership =
  | 'Public'
  | 'PE-owned'
  | 'VC-owned'
  | 'Private'
  | 'Founder-led'
  | 'Corporate subsidiary';

export interface FinRow {
  name: string;
  companyId?: number;
  logo?: string | null;
  isManuallyAdded?: boolean;
  primary: string;
  secondary: string;
  country: string;
  hq: string;
  ownership: Ownership;
  color: string;
  fte: number;
  revenue: number;
  rev_growth: number;
  ebitda: number;
  ebitda_margin: number;
  ebit: number;
  ev: number;
  ev_revenue: number;
  ev_ebitda: number;
  ev_ebit: number;
  rev_multiple: number;
  trend: number[];
  // optional extended columns
  churn?: number;
  grr?: number;
  nrr?: number;
  new_clients_rev?: number;
  upsell?: number;
  cross_sell?: number;
  price_increase?: number;
  revenue_expansion?: number;
  num_clients?: number;
  rev_per_client?: number;
  num_employees?: number;
  rev_per_employee?: number;
  financial_year?: string;
  rule_of_40?: number;
}

export interface ColumnDef {
  id: string;
  label: string;
  kind:
    | 'company'
    | 'sector'
    | 'ownership'
    | 'currency'
    | 'percent'
    | 'count'
    | 'multiple'
    | 'spark'
    | 'text';
  align: 'left' | 'right';
  sticky?: boolean;
  minWidth?: number;
  symbol?: string;
  delta?: boolean;
  median?: keyof SectorMedian;
  noSort?: boolean;
}

export interface ColumnCategory {
  id: string;
  name: string;
  description: string;
  columns: ColumnEntry[];
}

export interface ColumnEntry {
  id: string;
  label: string;
  type: string;
  locked?: boolean;
  defaultVisible?: boolean;
}

export interface FilterDef {
  id: string;
  label: string;
  fullLabel: string;
  category: string;
  type: string;
  editor: 'range' | 'enum' | 'text';
  min?: number;
  max?: number;
  unit?: string;
  presets?: [string, number, number][];
  options?: string[];
  depends?: string;
}

export interface FilterState {
  id: string;
  value: string[] | number[] | { min?: number; max?: number } | string;
}

export interface AppState {
  searchText: string;
  viewId: string | null;
  filters: FilterState[];
}

export interface Tweaks {
  sectionName: string;
  showMedian: boolean;
  colorMultiples: boolean;
  chipStyle: 'neutral' | 'cyan' | 'outlined';
  chipIcon: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
  /** Hide colored initial/logo beside company names in the table. */
  hideCompanyAvatars?: boolean;
  /** Show remove control per peer row (Financial Intelligence). */
  showPeerActions?: boolean;
  /** Peer-set aggregate row uses median or mean (Financial Intelligence). */
  peerAggregateMode?: "median" | "mean";
}

export interface SectorMedian {
  fte: number;
  revenue: number;
  rev_growth: number;
  ebitda: number;
  ebitda_margin: number;
  ebit: number;
  ev: number;
  ev_revenue: number;
  ev_ebit: number;
  ev_ebitda: number;
  rev_multiple: number;
}
