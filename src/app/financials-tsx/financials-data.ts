import type {
  FilterDef,
  SectorMedian,
  FinRow,
} from './types';

// ── Filter categories ──────────────────────────────────────────────────────
export const FIN_FILTER_CATEGORIES = [
  { id: 'company',       name: 'Company'              },
  { id: 'sector',        name: 'Sector classification' },
  { id: 'valuation',     name: 'Valuation'            },
  { id: 'profitability', name: 'Profitability'        },
  { id: 'growth',        name: 'Growth'               },
];

export const FIN_FILTER_DEFS: FilterDef[] = [
  /* ---- Company ---- */
  { id: 'fte', label: 'FTE', fullLabel: 'Number of FTE', category: 'company', type: '#', editor: 'range',
    min: 0, max: 50000,
    presets: [['<50',0,50],['50–250',50,250],['250–1k',250,1000],['1k–10k',1000,10000],['10k+',10000,50000]] },
  { id: 'ownership', label: 'Ownership', fullLabel: 'Ownership Type', category: 'company', type: 'Aa', editor: 'enum',
    options: ['Public','PE-owned','VC-owned','Founder-led','Private','Corporate subsidiary'] },
  { id: 'region', label: 'Region', fullLabel: 'Continental Region', category: 'company', type: 'Aa', editor: 'enum',
    options: ['North America','Europe','Asia-Pacific','Latin America','Middle East & Africa'] },
  { id: 'country', label: 'Country', fullLabel: 'Country', category: 'company', type: 'Aa', editor: 'enum',
    options: ['United States','United Kingdom','Germany','France','Netherlands','Switzerland','Sweden','Italy','Canada','Singapore'] },
  { id: 'transaction', label: 'Transaction status', fullLabel: 'Transaction Status', category: 'company', type: 'Aa', editor: 'enum',
    options: ['For sale','Anticipated 0-12 mo','Anticipated 12-24 mo','Recently transacted','Not for sale'] },

  /* ---- Sector ---- */
  { id: 'primary_sector', label: 'Primary sector', fullLabel: 'Primary Sector(s)', category: 'sector', type: 'Aa', editor: 'enum',
    options: ['Investment Research & Data','Capital Markets Data','Credit & Risk','Compliance & RegTech','ESG & Sustainability','Market Intelligence','M&A / Deal Data','Pricing & Reference Data','Index Providers','Alternative Data','InsurTech','LegalTech','Healthcare Data','Energy & Commodities Data'] },
  { id: 'secondary_sector', label: 'Secondary sector', fullLabel: 'Secondary Sector(s)', category: 'sector', type: 'Aa', editor: 'enum', depends: 'primary_sector',
    options: ['Equity research','Fixed income','Private markets','ETF','Climate','Carbon','M&A advisory','Index licensing','Ratings','Pricing','Workflow software','Terminal','API / Feed'] },

  /* ---- Valuation ---- */
  { id: 'ev', label: 'EV', fullLabel: 'Enterprise Value ($m)', category: 'valuation', type: '$', editor: 'range',
    unit: '$m', min: 0, max: 50000,
    presets: [['<$100m',0,100],['$100m–$1b',100,1000],['$1–10b',1000,10000],['Mega',10000,50000]] },
  { id: 'ev_revenue', label: 'EV / Revenue', fullLabel: 'EV / Revenue (x)', category: 'valuation', type: '#', editor: 'range',
    unit: 'x', min: 0, max: 30,
    presets: [['<3x',0,3],['3–7x',3,7],['7–15x',7,15],['15x+',15,30]] },
  { id: 'ev_ebitda', label: 'EV / EBITDA', fullLabel: 'EV / EBITDA (x)', category: 'valuation', type: '#', editor: 'range',
    unit: 'x', min: 0, max: 60,
    presets: [['<10x',0,10],['10–15x',10,15],['15–25x',15,25],['25x+',25,60]] },
  { id: 'ev_ebit', label: 'EV / EBIT', fullLabel: 'EV / EBIT (x)', category: 'valuation', type: '#', editor: 'range',
    unit: 'x', min: 0, max: 80,
    presets: [['<15x',0,15],['15–25x',15,25],['25x+',25,80]] },
  { id: 'rev_multiple', label: 'Revenue multiple', fullLabel: 'Revenue Multiple (x)', category: 'valuation', type: '#', editor: 'range',
    unit: 'x', min: 0, max: 30,
    presets: [['<3x',0,3],['3–7x',3,7],['7x+',7,30]] },

  /* ---- Profitability ---- */
  { id: 'revenue', label: 'Revenue', fullLabel: 'Revenue ($m)', category: 'profitability', type: '$', editor: 'range',
    unit: '$m', min: 0, max: 5000,
    presets: [['<$10m',0,10],['$10–49m',10,49],['$50–99m',50,99],['$100–499m',100,499],['$500m+',500,5000]] },
  { id: 'ebitda', label: 'EBITDA', fullLabel: 'EBITDA ($m)', category: 'profitability', type: '$', editor: 'range',
    unit: '$m', min: -100, max: 2000,
    presets: [['Profitable',0,2000],['$10m+',10,2000],['$50m+',50,2000]] },
  { id: 'ebit', label: 'EBIT', fullLabel: 'EBIT ($m)', category: 'profitability', type: '$', editor: 'range',
    unit: '$m', min: -100, max: 2000,
    presets: [['Profitable',0,2000],['$10m+',10,2000]] },
  { id: 'ebitda_margin', label: 'EBITDA margin', fullLabel: 'EBITDA Margin (%)', category: 'profitability', type: '%', editor: 'range',
    unit: '%', min: -50, max: 80,
    presets: [['≥20%',20,80],['≥30%',30,80],['≥40%',40,80]] },
  { id: 'ebit_margin', label: 'EBIT margin', fullLabel: 'EBIT Margin (%)', category: 'profitability', type: '%', editor: 'range',
    unit: '%', min: -50, max: 60,
    presets: [['≥15%',15,60],['≥25%',25,60]] },

  /* ---- Growth ---- */
  { id: 'rev_growth', label: 'Revenue growth', fullLabel: 'Revenue Growth (%)', category: 'growth', type: '%', editor: 'range',
    unit: '%', min: -30, max: 200,
    presets: [['≥10%',10,200],['≥25%',25,200],['≥50%',50,200]] },
  { id: 'rule_40', label: 'Rule of 40', fullLabel: 'Rule of 40 (%)', category: 'growth', type: '%', editor: 'range',
    unit: '%', min: 0, max: 150,
    presets: [['≥40%',40,150],['≥60%',60,150]] },
];

// ── Saved views ──────────────────────────────────────────────────────────────
export const FIN_SAVED_VIEWS = [
  { id: 'eu_d_a',     name: 'EU D&A — Comps',            description: '3 filters', match: 142 },
  { id: 'profitable', name: 'Profitable @ Rule of 40',   description: '2 filters', match: 87  },
  { id: 'sub_15x',    name: 'EV/EBITDA < 15x — Mid-mkt', description: '4 filters', match: 56  },
  { id: 'mega_caps',  name: 'EV ≥ $10b',                 description: '1 filter',  match: 18  },
];

// ── Period / currency options ────────────────────────────────────────────────
export const FIN_PERIODS = [
  { id: 'ltm',  label: 'LTM',      hint: 'May 25 – Apr 26' },
  { id: 'fy25', label: 'FY 2025E', hint: 'Estimate'        },
  { id: 'fy24', label: 'FY 2024A', hint: 'Actual'          },
  { id: 'fy23', label: 'FY 2023A', hint: 'Actual'          },
  { id: 'fy22', label: 'FY 2022A', hint: 'Actual'          },
];

export const FIN_CURRENCIES = [
  { id: 'usd', symbol: '$', label: 'USD' },
  { id: 'eur', symbol: '€', label: 'EUR' },
  { id: 'gbp', symbol: '£', label: 'GBP' },
];

// ── Raw company data ─────────────────────────────────────────────────────────
// [ name, primarySector, secondarySector, country, ownership, color,
//   fte, revenue, revGrowth, ebitda, ebitdaMargin, ebit, ev, trendSeries ]
type RawRow = [string,string,string,string,string,string,
               number,number,number,number,number,number,number,number[]];

export const FIN_RAW_ROWS: RawRow[] = [
  ['MSCI',                   'Index Providers',           'ETF',              'United States', 'Public',   '#0370AA', 5800,  2650, 14,  1620, 61.1, 1510, 41200,  [11,12,12,13,13,14,14] ],
  ['S&P Global',             'Index Providers',           'Ratings',          'United States', 'Public',   '#02527D', 40000, 13800, 8,  6900, 50.0, 6300, 138000, [7,8,8,9,9,10,8] ],
  ["Moody's",                'Credit & Risk',             'Ratings',          'United States', 'Public',   '#0788C8', 14800, 6850, 10,  3120, 45.5, 2880, 76000,  [8,9,9,10,10,11,10] ],
  ['Morningstar',            'Investment Research & Data','Equity research',  'United States', 'Public',   '#15A2EA', 11900, 2280, 11,  462,  20.3, 380,  13900,  [10,11,11,12,11,11,11] ],
  ['PitchBook Data',         'Private Markets',           'Private markets',  'United States', 'Public',   '#0370AA', 3100,  420,  18,  118,  28.1, 95,   4900,   [14,16,18,20,19,18,18] ],
  ['Preqin',                 'Alt. Investments',          'Private markets',  'United Kingdom','PE-owned', '#0788C8', 520,   215,  22,  69,   32.0, 58,   3100,   [16,18,21,22,22,22,22] ],
  ['With Intelligence',      'Capital Markets Data',      'Pricing',          'United Kingdom','PE-owned', '#15A2EA', 720,   180,  15,  47,   26.1, 38,   1850,   [10,11,13,14,15,15,15] ],
  ['Sustainalytics',         'ESG & Sustainability',      'Climate',          'Netherlands',   'Public',   '#7B5CD9', 1900,  310,  14,  75,   24.2, 62,   3800,   [12,13,14,14,14,14,14] ],
  ['Mergermarket',           'M&A / Deal Data',           'M&A advisory',     'United Kingdom','PE-owned', '#0370AA', 480,   160,  12,  45,   28.1, 38,   1650,   [9,10,11,12,12,12,12] ],
  ['Acuris',                 'Credit & Risk',             'Ratings',          'United States', 'PE-owned', '#54C7FF', 640,   210,  13,  63,   30.0, 53,   2380,   [10,11,12,12,13,13,13] ],
  ['Cerved',                 'Credit & Risk',             'Ratings',          'Italy',         'PE-owned', '#0788C8', 2200,  520,  10,  161,  31.0, 130,  5200,   [8,9,9,10,10,10,10] ],
  ['Burgiss',                'Private Markets',           'Private markets',  'United States', 'Public',   '#15A2EA', 380,   120,  18,  41,   34.0, 35,   1700,   [12,13,14,14,14,14,14] ],
  ['Statista',               'Market Intelligence',       'Workflow software','Germany',       'PE-owned', '#0370AA', 1100,  95,   20,  25,   26.2, 19,   850,    [7,8,8,9,9,9,9] ],
  ['Coalition Greenwich',    'Capital Markets Data',      'Equity research',  'United States', 'PE-owned', '#02527D', 250,   110,  11,  24,   22.0, 19,   1050,   [8,9,9,10,9,9,9] ],
  ['Dealogic',               'Capital Markets Data',      'M&A advisory',     'United Kingdom','PE-owned', '#0788C8', 420,   195,   9,  68,   34.9, 60,   2150,   [9,10,10,11,11,11,11] ],
  ['Bureau van Dijk',        'Credit & Risk',             'Workflow software','Belgium',       'Public',   '#15A2EA', 900,   340,   7,  119,  35.0, 102,  3650,   [8,9,9,10,10,10,10] ],
];

export const FIN_SECTOR_MEDIAN: SectorMedian = {
  fte: 900, revenue: 215, rev_growth: 13.5,
  ebitda: 71, ebitda_margin: 30.5, ebit: 60,
  ev: 2880, ev_revenue: 12.5, ev_ebit: 30, ev_ebitda: 19, rev_multiple: 12.5,
};

export function normalizeRow(raw: RawRow): FinRow {
  const [name, primary, secondary, country, ownership, color,
         fte, revenue, revGrowth, ebitda, ebitdaMargin, ebit, ev, trend] = raw;
  return {
    name, primary, secondary,
    country, hq: country,
    ownership: ownership as FinRow['ownership'],
    color, fte, revenue,
    rev_growth: revGrowth,
    ebitda, ebitda_margin: ebitdaMargin, ebit, ev,
    ev_revenue:   ev / revenue,
    ev_ebitda:    ev / ebitda,
    ev_ebit:      ev / ebit,
    rev_multiple: ev / revenue,
    trend,
  };
}

export const FIN_ROWS: FinRow[] = FIN_RAW_ROWS.map(normalizeRow);
