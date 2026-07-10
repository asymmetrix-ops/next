import type { ColumnCategory } from './types';

export const FIN_COLUMN_CATEGORIES: ColumnCategory[] = [
  {
    id: 'company_info',
    name: 'Company Info',
    description: 'Reference fields for each peer row.',
    columns: [
      { id: 'company',        label: 'Company',        type: 'text',   locked: true, defaultVisible: true  },
      { id: 'financial_year', label: 'Financial Year', type: 'date',                 defaultVisible: false },
      { id: 'sector',         label: 'Sector',         type: 'text',                 defaultVisible: true  },
      { id: 'hq',             label: 'HQ',             type: 'text',                 defaultVisible: true  },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'Size and operating scale metrics.',
    columns: [
      { id: 'revenue',          label: 'Revenue',              type: 'currency', defaultVisible: true  },
      { id: 'arr',              label: 'ARR',                  type: 'currency', defaultVisible: false },
      { id: 'ev',               label: 'EV',                   type: 'currency', defaultVisible: true  },
      { id: 'num_clients',      label: 'Number of clients',    type: 'number',   defaultVisible: false },
      { id: 'rev_per_employee', label: 'Revenue per employee', type: 'currency', defaultVisible: false },
    ],
  },
  {
    id: 'profitability',
    name: 'Profitability',
    description: 'Earnings and margin metrics.',
    columns: [
      { id: 'ebitda',        label: 'EBITDA',        type: 'currency', defaultVisible: true  },
      { id: 'ebit',          label: 'EBIT',          type: 'currency', defaultVisible: true  },
      { id: 'ebitda_margin', label: 'EBITDA margin', type: 'percent',  defaultVisible: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth & Expansion',
    description: 'Top-line growth and expansion metrics.',
    columns: [
      { id: 'rev_growth',    label: 'Revenue growth',    type: 'percent', defaultVisible: true  },
      { id: 'new_clients_rev', label: 'New client growth', type: 'percent', defaultVisible: false },
      { id: 'rule_of_40',    label: 'Rule of 40',        type: 'number',  defaultVisible: false },
      { id: 'nrr',           label: 'NRR',               type: 'percent', defaultVisible: false },
    ],
  },
  {
    id: 'valuation',
    name: 'Valuation',
    description: 'Trading and transaction multiples.',
    columns: [
      { id: 'rev_multiple', label: 'Revenue multiple', type: 'number', defaultVisible: true },
      { id: 'ev_revenue',  label: 'EV / Revenue',     type: 'number', defaultVisible: true },
      { id: 'ev_ebitda',   label: 'EV / EBITDA',      type: 'number', defaultVisible: true },
    ],
  },
];

// ── Derived helpers ──────────────────────────────────────────────────────────

export const FIN_COLUMN_DEFAULT_VISIBILITY: Record<string, boolean> = (() => {
  const out: Record<string, boolean> = {};
  for (const cat of FIN_COLUMN_CATEGORIES) {
    for (const c of cat.columns) out[c.id] = !!c.defaultVisible;
  }
  return out;
})();

export const FIN_COLUMN_ORDER: string[] =
  FIN_COLUMN_CATEGORIES.flatMap(cat => cat.columns.map(c => c.id));

export const FIN_COLUMN_TOTAL: number = FIN_COLUMN_ORDER.length;
