// tokens.jsx — design tokens + mock company data as ES module exports.
// Same values as ../tokens.jsx, just exported instead of stamped onto window.

export const T = {
  // surfaces
  paper:   '#FAFAF7',
  panel:   '#FFFFFF',
  inset:   '#F4F3EE',
  divider: 'rgba(15, 17, 21, 0.08)',
  hair:    'rgba(15, 17, 21, 0.06)',

  // ink
  ink:   '#0F1115',
  body:  '#2A2D33',
  muted: '#6B6E76',
  faint: '#9A9CA3',

  // Asymmetrix palette
  azure:        'oklch(54% 0.22 258)',
  azureSoft:    'oklch(96% 0.035 258)',
  azureBand:    'oklch(28% 0.14 258)',
  azureDeep:    'oklch(18% 0.08 258)',
  lavender:     'oklch(64% 0.16 285)',
  lavenderSoft: 'oklch(94% 0.045 285)',
  coral:        'oklch(68% 0.13 25)',
  coralSoft:    'oklch(95% 0.04 25)',
  emerald:      'oklch(56% 0.13 158)',
  emeraldSoft:  'oklch(95% 0.05 158)',
  signal:       'oklch(60% 0.16 48)',
  signalSoft:   'oklch(95% 0.05 70)',
  up:           'oklch(55% 0.13 150)',
  down:         'oklch(55% 0.17 25)',

  // aliases
  indigo:     'oklch(54% 0.22 258)',
  indigoSoft: 'oklch(96% 0.035 258)',
  plum:       'oklch(64% 0.16 285)',

  // radii / shadow
  r: 6,
  rLg: 10,
  shadow1: '0 1px 0 rgba(15,17,21,0.04)',
  shadow2: '0 1px 2px rgba(15,17,21,0.04), 0 4px 16px rgba(15,17,21,0.04)',

  // type
  sans: 'var(--font-geist-sans, "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif)',
  mono: 'var(--font-geist-mono, "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace)',
  serif: '"Fraunces", Georgia, serif',
  editorial: 'oklch(38% 0.12 30)',
};

// Mock company data — Morningstar as the example
export const COMPANY = {
  name: 'Morningstar',
  ticker: 'MORN',
  exchange: 'NASDAQ',
  logo: 'M',
  hq: 'Chicago, Illinois, United States',
  founded: '1984',
  employees: '12,400',
  website: 'morningstar.com',
  ownership: 'Public',
  lifecycle: 'Mature',
  primary: 'Investment Research & Data',
  secondary: ['Credit Ratings', 'ESG Data', 'Indexes', 'Wealth Tech'],
  description:
    'Morningstar, Inc. is an American financial services firm providing independent investment research and investment management. Founded in 1984 by Joe Mansueto, it offers data, software, and analytics across equity, fund, credit, ESG and private-markets coverage — used by advisors, asset managers, retirement plan providers, and individual investors worldwide.',

  productType: [
    { name: 'Data',               pct: 50, weight: 'Main'  },
    { name: 'Software',           pct: 20, weight: 'Main'  },
    { name: 'Research',           pct: 20, weight: 'Main'  },
    { name: 'News / Other Media', pct: 10, weight: 'Minor' },
  ],

  dataCollection: [
    { name: 'Public Filings / Government Data', weight: 'Main'  },
    { name: 'Manual',                           weight: 'Main'  },
    { name: 'Purchased Data',                   weight: 'Minor' },
    { name: 'Transaction-Generated',            weight: 'Minor' },
  ],

  revenueModel: [
    { name: 'Subscription',              weight: 'Main'  },
    { name: 'Licensing',                 weight: 'Minor' },
    { name: 'Transaction Fees',          weight: 'Minor' },
    { name: 'Consumption-Based / Usage', weight: 'Minor' },
  ],

  management: [
    { name: 'Kunal Kapoor',   role: 'CEO',                tenure: '9 yrs',  linkedin: true },
    { name: 'Jason Dubinsky', role: 'CFO',                tenure: '4 yrs',  linkedin: true },
    { name: 'Brian Grow',     role: 'President, Ratings', tenure: '6 yrs',  linkedin: true },
    { name: 'Daniel Needham', role: 'President, WM',      tenure: '3 yrs',  linkedin: true },
    { name: 'Detlef Scholz',  role: 'President, Data',    tenure: '5 yrs',  linkedin: true },
    { name: 'Steve Joynt',    role: 'Board Member',       tenure: '12 yrs', linkedin: true },
  ],

  fin: [
    { period: 'FY2025', rev: 2428, ebit: 411, ebitda: 612, marg: 25.2 },
    { period: 'FY2024', rev: 2274, ebit: 348, ebitda: 553, marg: 24.3 },
    { period: 'FY2023', rev: 2037, ebit: 182, ebitda: 401, marg: 19.7 },
  ],
  ev:        '14.6B',
  evRev:     '6.0x',
  evEbitda:  '23.8x',
  revGrowth: '+6.8%',
  rule40:    32,
  arr:       '1.94B',
  nrr:       '108%',
  gdr:       '94%',
  clv:       'n/a',

  subs: [
    { name: 'PitchBook',          sector: 'Private Markets Data', employees: 3100, country: 'US' },
    { name: 'DBRS Morningstar',   sector: 'Credit Ratings',       employees: 780,  country: 'CA' },
    { name: 'Sustainalytics',     sector: 'ESG Research',         employees: 1400, country: 'NL' },
    { name: 'Morningstar Indexes',sector: 'Index Provider',       employees: 120,  country: 'US' },
  ],

  events: [
    { date: 'Mar 2026', type: 'Acquisition', target: 'Lumonic (private credit data)',     amount: '$85m'  },
    { date: 'Nov 2025', type: 'Partnership', target: 'LSEG — data distribution',          amount: '—'     },
    { date: 'Jul 2025', type: 'Acquisition', target: 'Leveraged Commentary & Data',       amount: '$650m' },
    { date: 'Feb 2024', type: 'Divestiture', target: 'Commodity price-reporting unit',    amount: '—'     },
  ],

  insights: [
    {
      tag: 'Company Update', date: 'Apr 10, 2026',
      headline: 'PitchBook is doing the heavy lifting — and management knows it',
      dek: 'Q1 results put private-markets data growth ahead of the legacy fund-research business for the third consecutive quarter. Asymmetrix view: the GenAI capex cycle has not yet shown up in margin compression, but watch FY27 guidance.',
      body: 'Morningstar reports strong Q1 driven by PitchBook and Indexes; management flagged accelerating demand for private-markets data and a disciplined approach to GenAI-driven research automation.',
    },
    {
      tag: 'Sector Analysis', date: 'Mar 22, 2026',
      headline: 'A private-markets pure-play, hiding in a fund-research wrapper',
      dek: 'Multiple expansion in private-markets data has lifted comparable peers to 17–19× EBITDA. Morningstar trades closer to its legacy multiple, leaving a SOTP gap.',
      body: 'Private markets data vendors trade at premium multiples; Morningstar is increasingly viewed as a private-markets pure-play proxy via its PitchBook segment.',
    },
  ],

  coverageCount: 17,

  // headcount sparkline — 24 months of monthly values
  hc: [10400,10480,10520,10610,10700,10780,10830,10910,11020,11140,11210,11280,
       11360,11440,11520,11640,11780,11910,12010,12090,12180,12260,12340,12400],
};
