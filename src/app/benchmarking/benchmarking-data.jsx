/* =============================================================
   Benchmarking Control Room — data + stats helpers.

   A richer company universe than the screener sample, so peer
   pools and sector aggregates compute believably. Each company
   carries the metrics we benchmark on, plus the dimensions used
   to build a peer pool (sector, sub-sector, region, model,
   revenue band, ownership).

   Metric directionality:
     dir:'high' — higher is better (growth, margins, Rule of 40)
     dir:'low'  — lower is "better"/cheaper (valuation multiples)
   Favorability percentile always reads so that higher = better,
   regardless of direction, so a single color scale works.
   ============================================================= */

/* ---- Metric catalogue ---- */
const BM_METRICS = [
  /* Scale */
  { id: 'revenue',     label: 'Revenue',             short: 'Revenue',    unit: '$m', dir: 'high', group: 'Scale' },
  { id: 'arr',         label: 'ARR',                 short: 'ARR',        unit: '$m', dir: 'high', group: 'Scale' },
  { id: 'ebitda',      label: 'EBITDA',              short: 'EBITDA',     unit: '$m', dir: 'high', group: 'Scale' },
  { id: 'ebit',        label: 'EBIT',                short: 'EBIT',       unit: '$m', dir: 'high', group: 'Scale' },
  { id: 'ev',          label: 'EV',                  short: 'EV',         unit: '$m', dir: 'high', group: 'Scale' },
  { id: 'num_clients', label: 'Number of clients',   short: 'Clients',    unit: 'n',  dir: 'high', group: 'Scale' },
  { id: 'rev_per_emp', label: 'Revenue per employee',short: 'Rev/emp',    unit: '$k', dir: 'high', group: 'Scale' },
  /* Growth */
  { id: 'rev_growth',        label: 'Revenue growth',    short: 'Rev growth',  unit: '%', dir: 'high', group: 'Growth' },
  { id: 'new_client_growth', label: 'New client growth', short: 'New clients', unit: '%', dir: 'high', group: 'Growth' },
  { id: 'rule_40',           label: 'Rule of 40',        short: 'Rule of 40',  unit: '%', dir: 'high', group: 'Growth' },
  /* Retention & expansion */
  { id: 'nrr',            label: 'NRR',               short: 'NRR',        unit: '%', dir: 'high', group: 'Retention & expansion' },
  { id: 'churn',          label: 'Churn',             short: 'Churn',      unit: '%', dir: 'low',  group: 'Retention & expansion' },
  { id: 'upsell',         label: 'Upsell',            short: 'Upsell',     unit: '%', dir: 'high', group: 'Retention & expansion' },
  { id: 'cross_sell',     label: 'Cross-sell',        short: 'Cross-sell', unit: '%', dir: 'high', group: 'Retention & expansion' },
  { id: 'price_increase', label: 'Price increase',    short: 'Price',      unit: '%', dir: 'high', group: 'Retention & expansion' },
  { id: 'rev_expansion',  label: 'Revenue expansion', short: 'Rev exp',    unit: '%', dir: 'high', group: 'Retention & expansion' },
  /* Profitability */
  { id: 'ebitda_margin', label: 'EBITDA margin', short: 'EBITDA mgn', unit: '%', dir: 'high', group: 'Profitability' },
  /* Valuation */
  { id: 'rev_multiple',  label: 'Revenue multiple', short: 'Rev mult', unit: 'x', dir: 'low', group: 'Valuation' },
  { id: 'ev_ebitda',     label: 'EV / EBITDA',      short: 'EV/EBITDA', unit: 'x', dir: 'low', group: 'Valuation' },
];
const BM_METRIC_BY_ID = Object.fromEntries(BM_METRICS.map(m => [m.id, m]));
/* curated subset for the (wide) sector heatmap + league dropdown */
const BM_SECTOR_METRICS = ['revenue', 'rev_growth', 'nrr', 'rule_40', 'ebitda_margin', 'rev_per_emp', 'rev_multiple'].map(id => BM_METRIC_BY_ID[id]);

/* ---- Formatting ---- */
function fmtMetric(v, unit) {
  if (v == null || isNaN(v)) return '—';
  if (unit === '%') return v.toFixed(1) + '%';
  if (unit === 'x') return v.toFixed(1) + 'x';
  if (unit === '$m') return fmtRevenue(v);
  if (unit === '$k') return '$' + Math.round(v) + 'k';
  if (unit === 'n') return Math.round(v).toLocaleString('en-US');
  return String(v);
}
function fmtRevenue(m) {
  if (m == null) return '—';
  if (m >= 1000) return '$' + (m / 1000).toFixed(1).replace(/\.0$/, '') + 'b';
  return '$' + m + 'm';
}
function fmtSigned(v, unit) {
  if (v == null || isNaN(v)) return '—';
  const plus = v > 0 ? '+' : '';
  if (unit === '%') return plus + v.toFixed(1) + 'pts';
  if (unit === 'x') return plus + v.toFixed(1) + 'x';
  if (unit === '$m') return (v >= 0 ? '+' : '−') + '$' + fmtRevenue(Math.abs(v)).slice(1);
  if (unit === '$k') return plus + '$' + Math.round(v) + 'k';
  if (unit === 'n') return plus + Math.round(v).toLocaleString('en-US');
  return plus + v.toFixed(1);
}

/* ---- Stats ---- */
function bmMean(arr) {
  const a = arr.filter(v => v != null && !isNaN(v));
  if (!a.length) return null;
  return a.reduce((s, v) => s + v, 0) / a.length;
}
function bmMedian(arr) {
  const a = arr.filter(v => v != null && !isNaN(v)).slice().sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}
function bmMin(arr) { const a = arr.filter(v => v != null); return a.length ? Math.min(...a) : null; }
function bmMax(arr) { const a = arr.filter(v => v != null); return a.length ? Math.max(...a) : null; }
function bmQuantile(arr, q) {
  const a = arr.filter(v => v != null && !isNaN(v)).slice().sort((x, y) => x - y);
  if (!a.length) return null;
  const pos = (a.length - 1) * q;
  const base = Math.floor(pos), rest = pos - base;
  return a[base + 1] !== undefined ? a[base] + rest * (a[base + 1] - a[base]) : a[base];
}

/* favorability percentile: share of peers the target "beats", 0..100.
   For dir:'high', beating = having a higher value; for dir:'low', lower. */
function favorPercentile(value, peers, dir) {
  const a = peers.filter(v => v != null && !isNaN(v));
  if (!a.length || value == null) return null;
  const beat = a.filter(v => dir === 'high' ? value > v : value < v).length;
  const tie  = a.filter(v => v === value).length;
  return Math.round(((beat + 0.5 * tie) / a.length) * 100);
}
/* rank by favorability among target + peers, 1 = best */
function favorRank(value, peers, dir) {
  const all = [value, ...peers].filter(v => v != null && !isNaN(v));
  const sorted = all.slice().sort((x, y) => dir === 'high' ? y - x : x - y);
  return { rank: sorted.indexOf(value) + 1, of: all.length };
}

/* ---- Heat scale: score 0..1 (1=best) -> pale diverging bg + readable fg ---- */
function bmHeat(score) {
  if (score == null) return { bg: 'var(--ax-gray-50)', fg: 'var(--fg-4)' };
  const s = Math.max(0, Math.min(1, score));
  // interpolate bg between pale-red, neutral, pale-green
  const red = [251, 227, 224], neutral = [244, 246, 248], green = [216, 242, 230];
  let c;
  if (s < 0.5) { const t = s / 0.5; c = red.map((v, i) => Math.round(v + (neutral[i] - v) * t)); }
  else { const t = (s - 0.5) / 0.5; c = neutral.map((v, i) => Math.round(v + (green[i] - v) * t)); }
  const fg = s > 0.62 ? '#0B6E47' : s < 0.38 ? '#B23123' : 'var(--fg-2)';
  return { bg: `rgb(${c[0]},${c[1]},${c[2]})`, fg };
}

/* =============================================================
   Company universe
   fields: name, logo(initials), color, sector, subSector, region,
   country, ownership, model, revenue($m) + metric fields
   ============================================================= */
function bmClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
/* deterministic 0..1 pseudo-random from a company name + salt, so derived
   metrics are stable across renders (no flicker) yet varied per company */
function bmRand(name, salt) {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 10000) / 10000;
}
function bmCo(name, color, sector, subSector, region, country, ownership, model, revenue, revGrowth, ebitdaMargin, ebitMargin, evRevenue, evEbitda) {
  const j = (salt, amp) => (bmRand(name, salt) * 2 - 1) * amp;
  const recurring = model === 'B2B SaaS' ? 0.92 : model === 'Ratings' ? 0.62 : 0.80;
  const r1 = (v) => Math.round(v * 10) / 10;
  const arr = Math.round(revenue * bmClamp(recurring + j(1, 0.05), 0.5, 0.98));
  const ebitda = Math.round(revenue * ebitdaMargin / 100);
  const ebit = Math.round(revenue * ebitMargin / 100);
  const ev = Math.round(revenue * evRevenue);
  const churn = r1(bmClamp(12 - revGrowth * 0.16 + j(2, 2), 2, 16));
  const upsell = r1(bmClamp(6 + revGrowth * 0.26 + j(3, 2), 3, 26));
  const crossSell = r1(bmClamp(3 + revGrowth * 0.13 + j(4, 1.5), 2, 15));
  const priceInc = r1(bmClamp(3 + j(5, 2.5), 1, 9));
  const revExpansion = r1(upsell + crossSell + priceInc);
  const nrr = Math.round(bmClamp(100 + revExpansion - churn + j(6, 3), 88, 148));
  const newClientGrowth = r1(bmClamp(revGrowth * 0.85 + j(7, 5), -10, 60));
  const numClients = Math.round(revenue * (6 + bmRand(name, 8) * 22));
  const revPerEmp = Math.round(170 + ebitdaMargin * 2.4 + j(9, 45));
  return {
    name, color, sector, subSector, region, country, ownership, model,
    revenue, arr,
    rev_growth: revGrowth, new_client_growth: newClientGrowth,
    rule_40: r1(revGrowth + ebitdaMargin),
    nrr, churn, upsell, cross_sell: crossSell, price_increase: priceInc, rev_expansion: revExpansion,
    ebitda_margin: ebitdaMargin, ebitda, ebit, ebit_margin: ebitMargin,
    ev, ev_revenue: evRevenue, ev_ebitda: evEbitda, rev_multiple: evRevenue,
    num_clients: numClients, rev_per_emp: revPerEmp,
  };
}

/* Target company the user referenced */
const BM_TARGET = bmCo('Gain', '#0370AA', 'Investment Research & Data', 'Private markets', 'Europe', 'United Kingdom', 'PE-owned', 'B2B SaaS',
  180, 26, 31, 25, 6.5, 21);
BM_TARGET.isTarget = true;

const BM_UNIVERSE = [
  /* --- Investment Research & Data --- */
  bmCo('Preqin',            '#0788C8', 'Investment Research & Data', 'Private markets', 'Europe',        'United Kingdom', 'PE-owned', 'B2B SaaS',      215, 22, 32, 27, 7.4, 23),
  bmCo('With Intelligence', '#15A2EA', 'Investment Research & Data', 'Private markets', 'Europe',        'United Kingdom', 'PE-owned', 'B2B SaaS',      180, 15, 26, 21, 5.2, 19),
  bmCo('PitchBook',         '#0370AA', 'Investment Research & Data', 'Private markets', 'North America', 'United States',  'Public',   'B2B SaaS',      420, 18, 28, 23, 8.1, 26),
  bmCo('Morningstar',       '#02527D', 'Investment Research & Data', 'Equity research', 'North America', 'United States',  'Public',   'B2B SaaS',      280, 11, 20, 16, 4.7, 22),
  bmCo('Burgiss',           '#54C7FF', 'Investment Research & Data', 'Private markets', 'North America', 'United States',  'Public',   'B2B SaaS',      120, 18, 34, 29, 9.2, 27),
  bmCo('CB Insights',       '#0788C8', 'Investment Research & Data', 'Private markets', 'North America', 'United States',  'VC-owned', 'B2B SaaS',      95,  20, 22, 17, 6.0, 24),
  bmCo('Coalition Grnwch',  '#15A2EA', 'Investment Research & Data', 'Equity research', 'North America', 'United States',  'PE-owned', 'B2B SaaS',      110, 11, 22, 18, 4.4, 20),

  /* --- Credit & Risk --- */
  bmCo('Moody\'s',          '#0370AA', 'Credit & Risk', 'Ratings',          'North America', 'United States',  'Public',   'Ratings',  6850, 10, 45, 41, 11.1, 25),
  bmCo('Acuris',            '#0788C8', 'Credit & Risk', 'Ratings',          'North America', 'United States',  'PE-owned', 'B2B SaaS', 210,  13, 30, 25, 6.8, 22),
  bmCo('Cerved',            '#15A2EA', 'Credit & Risk', 'Ratings',          'Europe',        'Italy',          'PE-owned', 'B2B SaaS', 520,  10, 31, 25, 5.9, 19),
  bmCo('Bureau van Dijk',   '#54C7FF', 'Credit & Risk', 'Workflow',         'Europe',        'Belgium',        'Public',   'B2B SaaS', 340,  7,  35, 30, 7.1, 20),
  bmCo('CRIF',              '#0788C8', 'Credit & Risk', 'Workflow',         'Europe',        'Italy',          'Private',  'B2B SaaS', 290,  9,  28, 22, 5.0, 18),

  /* --- ESG & Sustainability --- */
  bmCo('Sustainalytics',    '#7B5CD9', 'ESG & Sustainability', 'Climate',  'Europe',        'Netherlands',    'Public',   'B2B SaaS', 310, 14, 24, 20, 8.4, 24),
  bmCo('Sphera',            '#0370AA', 'ESG & Sustainability', 'Climate',  'North America', 'United States',  'PE-owned', 'B2B SaaS', 250, 16, 26, 21, 7.8, 23),
  bmCo('Watershed',         '#15A2EA', 'ESG & Sustainability', 'Carbon',   'North America', 'United States',  'VC-owned', 'B2B SaaS', 70,  42, 8,  2,  12.5, 60),
  bmCo('Persefoni',         '#54C7FF', 'ESG & Sustainability', 'Carbon',   'North America', 'United States',  'VC-owned', 'B2B SaaS', 45,  38, 5,  0,  10.0, 55),
  bmCo('Position Green',    '#0788C8', 'ESG & Sustainability', 'Climate',  'Europe',        'Sweden',         'PE-owned', 'B2B SaaS', 60,  35, 14, 9,  6.5, 30),

  /* --- Capital Markets Data --- */
  bmCo('Dealogic',          '#0370AA', 'Capital Markets Data', 'M&A',      'Europe',        'United Kingdom', 'PE-owned', 'B2B SaaS', 195, 9,  35, 31, 8.2, 23),
  bmCo('Mergermarket',      '#0788C8', 'Capital Markets Data', 'M&A',      'Europe',        'United Kingdom', 'PE-owned', 'B2B SaaS', 160, 12, 28, 24, 6.4, 21),
  bmCo('Dealroom',          '#15A2EA', 'Capital Markets Data', 'Private markets', 'Europe', 'Netherlands',    'VC-owned', 'B2B SaaS', 40,  28, 18, 12, 7.0, 35),
  bmCo('Tracxn',            '#54C7FF', 'Capital Markets Data', 'Private markets', 'Asia-Pacific','India',     'Public',   'B2B SaaS', 25,  24, 16, 10, 5.5, 30),

  /* --- Market Intelligence --- */
  bmCo('Statista',          '#0370AA', 'Market Intelligence', 'Workflow',  'Europe',        'Germany',        'PE-owned', 'B2B SaaS', 95,  20, 26, 19, 7.2, 28),
  bmCo('GlobalData',        '#0788C8', 'Market Intelligence', 'Workflow',  'Europe',        'United Kingdom', 'Public',   'B2B SaaS', 320, 11, 33, 27, 6.0, 18),
  bmCo('Gartner (digital)', '#15A2EA', 'Market Intelligence', 'Workflow',  'North America', 'United States',  'Public',   'B2B SaaS', 600, 9,  21, 17, 5.4, 25),
  bmCo('Euromonitor',       '#54C7FF', 'Market Intelligence', 'Workflow',  'Europe',        'United Kingdom', 'Private',  'B2B SaaS', 130, 8,  29, 24, 5.8, 20),

  /* --- Compliance & RegTech --- */
  bmCo('ComplyAdvantage',   '#0370AA', 'Compliance & RegTech', 'Workflow', 'Europe',        'United Kingdom', 'VC-owned', 'B2B SaaS', 80,  34, 12, 6,  9.0, 50),
  bmCo('Fenergo',           '#0788C8', 'Compliance & RegTech', 'Workflow', 'Europe',        'Ireland',        'PE-owned', 'B2B SaaS', 150, 22, 20, 14, 8.5, 38),
  bmCo('Encompass',         '#15A2EA', 'Compliance & RegTech', 'Workflow', 'Europe',        'United Kingdom', 'VC-owned', 'B2B SaaS', 35,  30, 10, 4,  7.5, 45),

  /* --- Index Providers --- */
  bmCo('MSCI',              '#0370AA', 'Index Providers', 'ETF',           'North America', 'United States',  'Public',   'B2B SaaS', 2650, 14, 61, 57, 15.5, 25),
  bmCo('S&P Global',        '#02527D', 'Index Providers', 'Ratings',       'North America', 'United States',  'Public',   'B2B SaaS', 13800, 8, 50, 46, 10.0, 20),
];

const BM_UNIVERSE_BY_NAME = Object.fromEntries(BM_UNIVERSE.map(c => [c.name, c]));
/* The target's default peer pool definition (smart default, editable) */
const BM_DEFAULT_FILTERS = [
  { id: 'region',   label: 'Region',      value: ['Europe'] },
  { id: 'model',    label: 'Model',       value: ['B2B SaaS'] },
  { id: 'revenue',  label: 'Revenue',     value: { min: 50, max: 500 }, fmt: 'rev' },
];

/* Catalogue of filters a user can add to refine the peer pool */
const BM_FILTER_CATALOGUE = [
  { id: 'sector',    label: 'Sector',       editor: 'enum', options: [...new Set(BM_UNIVERSE.map(c => c.sector))] },
  { id: 'subSector', label: 'Sub-sector',   editor: 'enum', options: [...new Set(BM_UNIVERSE.map(c => c.subSector))] },
  { id: 'region',    label: 'Region',       editor: 'enum', options: ['Europe', 'North America', 'Asia-Pacific', 'Latin America'] },
  { id: 'country',   label: 'Country',      editor: 'enum', options: [...new Set(BM_UNIVERSE.map(c => c.country))] },
  { id: 'ownership', label: 'Ownership',    editor: 'enum', options: ['Public', 'PE-owned', 'VC-owned', 'Private'] },
  { id: 'model',     label: 'Model',        editor: 'enum', options: [...new Set(BM_UNIVERSE.map(c => c.model))] },
  { id: 'revenue',   label: 'Revenue',      editor: 'range', unit: '$m', fmt: 'rev' },
  { id: 'ebitda_margin', label: 'EBITDA margin', editor: 'range', unit: '%' },
  { id: 'rev_growth',    label: 'Revenue growth', editor: 'range', unit: '%' },
];

/* Apply filters to the universe -> peer pool (excludes the target itself) */
function bmApplyFilters(filters) {
  return BM_UNIVERSE.filter(c => {
    for (const f of filters) {
      if (f.value == null) continue;
      if (Array.isArray(f.value)) {
        if (f.value.length && !f.value.includes(c[f.id])) return false;
      } else if (typeof f.value === 'object') {
        const v = c[f.id];
        if (v == null) return false;
        if (f.value.min != null && v < f.value.min) return false;
        if (f.value.max != null && v > f.value.max) return false;
      }
    }
    return true;
  });
}

/* Build a benchmark report: target vs peer pool across all metrics */
function bmBuildReport(target, peers) {
  const rows = BM_METRICS.map(m => {
    const peerVals = peers.map(p => p[m.id]);
    const tv = target[m.id];
    const mean = bmMean(peerVals), median = bmMedian(peerVals);
    const min = bmMin(peerVals), max = bmMax(peerVals);
    const q1 = bmQuantile(peerVals, 0.25), q3 = bmQuantile(peerVals, 0.75);
    const pct = favorPercentile(tv, peerVals, m.dir);
    const rk = favorRank(tv, peerVals, m.dir);
    return {
      metric: m, target: tv, mean, median, min, max, q1, q3,
      pct, rank: rk.rank, of: rk.of,
      deltaMedian: median != null ? tv - median : null,
    };
  });
  // composite percentile = mean of per-metric favorability percentiles
  const comp = bmMean(rows.map(r => r.pct));
  return { rows, composite: comp == null ? null : Math.round(comp) };
}

/* Sector aggregates for the sector-vs-sector view */
function bmSectorAggregates(level /* 'sector' | 'subSector' */) {
  const key = level === 'subSector' ? (c => c.sector + ' · ' + c.subSector) : (c => c.sector);
  const groups = {};
  for (const c of BM_UNIVERSE) {
    const k = key(c);
    (groups[k] = groups[k] || []).push(c);
  }
  const out = Object.entries(groups).map(([name, cos]) => {
    const row = { name, count: cos.length, sector: cos[0].sector,
      totalRevenue: cos.reduce((s, c) => s + c.revenue, 0) };
    for (const m of BM_METRICS) row[m.id] = bmMedian(cos.map(c => c[m.id]));
    return row;
  });
  return out.filter(r => r.count >= (level === 'subSector' ? 2 : 1));
}

/* Per-metric column scores (0..1, 1=best) for the heatmap, by directionality */
function bmHeatScores(aggregates) {
  const scores = {};
  for (const m of BM_METRICS) {
    const vals = aggregates.map(a => a[m.id]).filter(v => v != null);
    const lo = Math.min(...vals), hi = Math.max(...vals), span = (hi - lo) || 1;
    scores[m.id] = {};
    for (const a of aggregates) {
      const v = a[m.id];
      if (v == null) { scores[m.id][a.name] = null; continue; }
      let s = (v - lo) / span;            // 0..1 by raw value
      if (m.dir === 'low') s = 1 - s;     // invert so best=1
      scores[m.id][a.name] = s;
    }
  }
  return scores;
}

/* expose */
Object.assign(window, {
  BM_METRICS, BM_METRIC_BY_ID, BM_SECTOR_METRICS, BM_TARGET, BM_UNIVERSE, BM_UNIVERSE_BY_NAME,
  BM_DEFAULT_FILTERS, BM_FILTER_CATALOGUE,
  fmtMetric, fmtRevenue, fmtSigned,
  bmMean, bmMedian, bmMin, bmMax, bmQuantile,
  favorPercentile, favorRank, bmHeat,
  bmApplyFilters, bmBuildReport, bmSectorAggregates, bmHeatScores,
});
