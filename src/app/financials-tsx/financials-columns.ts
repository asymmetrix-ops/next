import type { ColumnCategory } from './types';

export const FIN_COLUMN_CATEGORIES: ColumnCategory[] = [
  {
    id: 'identity',
    name: 'Identity',
    description: 'Company name and core metadata. Always at the front of the row.',
    columns: [
      { id: 'company',   label: 'Company',          type: 'text',   locked: true, defaultVisible: true  },
      { id: 'sector',    label: 'Sector',           type: 'text',                 defaultVisible: true  },
      { id: 'hq',        label: 'HQ',               type: 'text',                 defaultVisible: true  },
      { id: 'ownership', label: 'Ownership',        type: 'text',                 defaultVisible: true  },
      { id: 'fte',       label: 'FTE',              type: 'number',               defaultVisible: false },
      { id: 'trend',     label: '5y revenue trend', type: 'spark',                defaultVisible: false },
    ],
  },
  {
    id: 'financial',
    name: 'Financial metrics',
    description: 'Revenue, profitability and headline valuation figures.',
    columns: [
      { id: 'revenue',       label: 'Revenue (m)',          type: 'currency', defaultVisible: true  },
      { id: 'ebitda',        label: 'EBITDA (m)',           type: 'currency', defaultVisible: true  },
      { id: 'ev',            label: 'Enterprise Value (m)', type: 'currency', defaultVisible: true  },
      { id: 'rev_multiple',  label: 'Revenue Multiple',     type: 'number',   defaultVisible: true  },
      { id: 'rev_growth',    label: 'Revenue Growth',       type: 'percent',  defaultVisible: true  },
      { id: 'ebitda_margin', label: 'EBITDA Margin',        type: 'percent',  defaultVisible: false },
      { id: 'rule_of_40',    label: 'Rule of 40',           type: 'number',   defaultVisible: false },
    ],
  },
  {
    id: 'comps',
    name: 'Comps',
    description: 'Trading multiples for benchmarking against a peer set.',
    columns: [
      { id: 'ev_revenue', label: 'EV / Revenue', type: 'number', defaultVisible: true },
      { id: 'ev_ebitda',  label: 'EV / EBITDA',  type: 'number', defaultVisible: true },
    ],
  },
  {
    id: 'subscription',
    name: 'Subscription metrics',
    description: 'Recurring-revenue mechanics for SaaS and information services.',
    columns: [
      { id: 'recurring_revenue', label: 'Recurring Revenue',          type: 'currency', defaultVisible: false },
      { id: 'arr',               label: 'ARR (m)',                    type: 'currency', defaultVisible: false },
      { id: 'churn',             label: 'Churn',                      type: 'percent',  defaultVisible: false },
      { id: 'grr',               label: 'GRR',                        type: 'percent',  defaultVisible: false },
      { id: 'nrr',               label: 'NRR',                        type: 'percent',  defaultVisible: false },
      { id: 'new_clients_rev',   label: 'New Clients Revenue Growth', type: 'percent',  defaultVisible: false },
      { id: 'upsell',            label: 'Upsell',                     type: 'percent',  defaultVisible: false },
      { id: 'cross_sell',        label: 'Cross-sell',                 type: 'percent',  defaultVisible: false },
      { id: 'price_increase',    label: 'Price Increase',             type: 'percent',  defaultVisible: false },
      { id: 'revenue_expansion', label: 'Revenue Expansion',          type: 'percent',  defaultVisible: false },
    ],
  },
  {
    id: 'other',
    name: 'Other metrics',
    description: 'Less common operating ratios and reference fields.',
    columns: [
      { id: 'ebit',             label: 'EBIT (m)',              type: 'currency', defaultVisible: true  },
      { id: 'ev_ebit',          label: 'EV / EBIT',             type: 'number',   defaultVisible: false },
      { id: 'num_clients',      label: 'Number of Clients',     type: 'number',   defaultVisible: false },
      { id: 'rev_per_client',   label: 'Revenue per Client',    type: 'currency', defaultVisible: false },
      { id: 'num_employees',    label: 'Number of Employees',   type: 'number',   defaultVisible: false },
      { id: 'rev_per_employee', label: 'Revenue per Employee',  type: 'currency', defaultVisible: false },
      { id: 'financial_year',   label: 'Financial Year',        type: 'date',     defaultVisible: false },
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
