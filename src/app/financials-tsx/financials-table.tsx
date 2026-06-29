import React, { useMemo } from 'react';
import type { FinRow, ColumnDef, Tweaks, SectorMedian } from './types';
import { FIN_SECTOR_MEDIAN } from './financials-data';

// ── Number formatting ────────────────────────────────────────────────────────

function fmtCurrency(v: number | undefined | null, symbol = '$'): string {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1000) return symbol + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'b';
  return symbol + n.toFixed(0) + 'm';
}

function fmtX(v: number | undefined | null): string {
  if (v === null || v === undefined || !isFinite(v as number)) return '—';
  return Number(v).toFixed(1) + 'x';
}

// ── Coloring helpers ─────────────────────────────────────────────────────────

interface MultipleTint {
  fg: string;
  label: 'cheap' | 'premium';
}

function multipleTint(value: number, median: number | undefined): MultipleTint | null {
  if (value == null || !isFinite(value) || !median) return null;
  const r = value / median;
  if (r <= 0.80) return { fg: 'var(--ax-positive)', label: 'cheap' };
  if (r >= 1.30) return { fg: 'var(--ax-negative)', label: 'premium' };
  return null;
}

function finRowValue(row: FinRow, key: string): unknown {
  if (key in row) return row[key as keyof FinRow];
  return undefined;
}

// ── Sparkline ────────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 56, height = 18, color = 'var(--ax-cyan-600)' }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data);
  const span = mx - mn || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d - mn) / span) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaPts = `0,${height} ${pts} ${width},${height}`;
  const lastY = (height - ((data[data.length - 1] - mn) / span) * (height - 2) - 1).toFixed(1);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polygon points={areaPts} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="1.6" fill={color} />
    </svg>
  );
}

// ── Ownership pill ───────────────────────────────────────────────────────────

const OWNERSHIP_STYLES: Record<string, { bg: string; fg: string }> = {
  'Public':               { bg: '#EDE7F9', fg: '#5436A8' },
  'PE-owned':             { bg: 'var(--ax-cyan-50)',         fg: 'var(--ax-cyan-700)' },
  'VC-owned':             { bg: 'var(--ax-positive-bg)',     fg: 'var(--ax-positive)' },
  'Private':              { bg: 'var(--ax-warning-bg)',      fg: '#7A4E0E' },
  'Founder-led':          { bg: 'var(--ax-gray-100)',        fg: 'var(--fg-2)' },
  'Corporate subsidiary': { bg: 'var(--ax-gray-100)',        fg: 'var(--fg-2)' },
};

function OwnershipTag({ kind }: { kind: string }) {
  const s = OWNERSHIP_STYLES[kind] ?? { bg: 'var(--ax-gray-100)', fg: 'var(--fg-2)' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px',
      fontSize: 11, fontWeight: 600, borderRadius: 999,
      background: s.bg, color: s.fg, whiteSpace: 'nowrap',
    }}>{kind}</span>
  );
}

// ── Column definitions ───────────────────────────────────────────────────────

export function buildColumns(currencySymbol: string): ColumnDef[] {
  return [
    { id: 'company',       label: 'Company',           kind: 'company',  align: 'left',  sticky: true, minWidth: 170 },
    { id: 'sector',        label: 'Sector',            kind: 'sector',   align: 'left',  minWidth: 150 },
    { id: 'hq',            label: 'HQ',                kind: 'text',     align: 'left',  minWidth: 70 },
    { id: 'ownership',     label: 'Ownership',         kind: 'ownership',align: 'left',  minWidth: 110 },
    { id: 'fte',           label: 'FTE',               kind: 'count',    align: 'right' },
    { id: 'revenue',       label: 'Revenue',           kind: 'currency', align: 'right', symbol: currencySymbol },
    { id: 'ebitda',        label: 'EBITDA',            kind: 'currency', align: 'right', symbol: currencySymbol },
    { id: 'ev',            label: 'EV',                kind: 'currency', align: 'right', symbol: currencySymbol },
    { id: 'rev_multiple',  label: 'Rev multiple',      kind: 'multiple', align: 'right', median: 'rev_multiple' },
    { id: 'rev_growth',    label: 'Rev growth',        kind: 'percent',  align: 'right', delta: true },
    { id: 'ebitda_margin', label: 'EBITDA margin',     kind: 'percent',  align: 'right' },
    { id: 'rule_of_40',    label: 'Rule of 40',        kind: 'count',    align: 'right' },
    { id: 'ev_revenue',    label: 'EV / Revenue',      kind: 'multiple', align: 'right', median: 'ev_revenue' },
    { id: 'ev_ebitda',     label: 'EV / EBITDA',       kind: 'multiple', align: 'right', median: 'ev_ebitda' },
    { id: 'recurring_revenue', label: 'Recurring rev', kind: 'currency', align: 'right', symbol: currencySymbol },
    { id: 'arr',               label: 'ARR',           kind: 'currency', align: 'right', symbol: currencySymbol },
    { id: 'churn',             label: 'Churn',         kind: 'percent',  align: 'right' },
    { id: 'grr',               label: 'GRR',           kind: 'percent',  align: 'right' },
    { id: 'nrr',               label: 'NRR',           kind: 'percent',  align: 'right' },
    { id: 'new_clients_rev',   label: 'New clients rev growth', kind: 'percent', align: 'right' },
    { id: 'upsell',            label: 'Upsell',        kind: 'percent',  align: 'right' },
    { id: 'cross_sell',        label: 'Cross-sell',    kind: 'percent',  align: 'right' },
    { id: 'price_increase',    label: 'Price increase',kind: 'percent',  align: 'right' },
    { id: 'revenue_expansion', label: 'Revenue expansion', kind: 'percent', align: 'right' },
    { id: 'ebit',             label: 'EBIT',                 kind: 'currency', align: 'right', symbol: currencySymbol },
    { id: 'ev_ebit',          label: 'EV / EBIT',            kind: 'multiple', align: 'right', median: 'ev_ebit' },
    { id: 'num_clients',      label: 'Clients',              kind: 'count',    align: 'right' },
    { id: 'rev_per_client',   label: 'Revenue / client',     kind: 'currency', align: 'right', symbol: currencySymbol },
    { id: 'num_employees',    label: 'Employees',            kind: 'count',    align: 'right' },
    { id: 'rev_per_employee', label: 'Revenue / employee',   kind: 'currency', align: 'right', symbol: currencySymbol },
    { id: 'financial_year',   label: 'FY end',               kind: 'text',     align: 'left',  minWidth: 90 },
    { id: 'trend',            label: '5y trend',             kind: 'spark',    align: 'right', noSort: true, minWidth: 70 },
  ];
}

// ── Cell renderer ────────────────────────────────────────────────────────────

interface CellProps {
  col: ColumnDef;
  row: FinRow;
  tweaks: Tweaks;
  currencySymbol: string;
  isMedian?: boolean;
  sectorMedian?: SectorMedian;
}

function Triangle({ dir, color }: { dir: 'up' | 'down'; color: string }) {
  return (
    <svg width="8" height="6" viewBox="0 0 8 6" fill={color}
         style={{ transform: dir === 'down' ? 'rotate(180deg)' : 'none', transformOrigin: 'center' }}>
      <path d="M4 0L8 6H0L4 0z" />
    </svg>
  );
}

export function Cell({ col, row, tweaks, currencySymbol, isMedian, sectorMedian = FIN_SECTOR_MEDIAN }: CellProps) {
  const v = finRowValue(row, col.id) as number | string | number[] | undefined;

  switch (col.kind) {
    case 'company':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!tweaks.hideCompanyAvatars && (
            <span style={{
              width: 22, height: 22, borderRadius: 5, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: row.color, color: 'white', fontSize: 10, fontWeight: 700,
            }}>{row.name.split(' ')[0][0]}</span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 600, fontSize: 12.5, color: 'var(--fg-1)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{row.name}</div>
          </div>
        </div>
      );

    case 'sector':
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.primary}</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{row.secondary}</div>
        </div>
      );

    case 'ownership':
      return <OwnershipTag kind={row.ownership} />;

    case 'count':
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v == null ? '—' : (v as number).toLocaleString()}</span>;

    case 'currency':
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(v as number, col.symbol ?? currencySymbol)}</span>;

    case 'percent': {
      if (v == null) return <span style={{ color: 'var(--fg-4)' }}>—</span>;
      const n = v as number;
      const sign = n > 0 ? '+' : '';
      const fg = col.delta
        ? (n > 0 ? 'var(--ax-positive)' : n < 0 ? 'var(--ax-negative)' : 'var(--fg-2)')
        : 'var(--fg-1)';
      return (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: fg, fontWeight: col.delta ? 600 : 500 }}>
          {sign}{n.toFixed(n % 1 === 0 ? 0 : 1)}%
        </span>
      );
    }

    case 'multiple': {
      if (v == null || !isFinite(v as number)) return <span style={{ color: 'var(--fg-4)' }}>—</span>;
      const median = col.median ? sectorMedian[col.median] : undefined;
      const tint = tweaks.colorMultiples && !isMedian ? multipleTint(v as number, median) : null;
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontVariantNumeric: 'tabular-nums',
          color: tint?.fg ?? 'var(--fg-1)', fontWeight: tint ? 600 : 500,
        }}>
          {tint?.label === 'cheap'   && <Triangle dir="down" color={tint.fg} />}
          {tint?.label === 'premium' && <Triangle dir="up"   color={tint.fg} />}
          {fmtX(v as number)}
        </span>
      );
    }

    case 'spark':
      return <Sparkline data={row.trend} />;

    default:
      if (v == null || v === '') return <span style={{ color: 'var(--fg-4)' }}>—</span>;
      return <span style={{ color: 'var(--fg-1)' }}>{String(v)}</span>;
  }
}

// ── FinancialsTable ──────────────────────────────────────────────────────────

export interface FinancialsTableProps {
  rows: FinRow[];
  tweaks: Tweaks;
  currencySymbol?: string;
  sortId: string;
  sortDir: 'asc' | 'desc';
  onSort: (id: string) => void;
  visibleColumnIds: string[];
  sectorMedian?: SectorMedian;
}

export function FinancialsTable({
  rows,
  tweaks,
  currencySymbol = '$',
  sortId,
  sortDir,
  onSort,
  visibleColumnIds,
  sectorMedian = FIN_SECTOR_MEDIAN,
}: FinancialsTableProps) {
  const allColumns = buildColumns(currencySymbol);
  const columns = useMemo(
    () => allColumns.filter(c => visibleColumnIds.includes(c.id)),
    [allColumns, visibleColumnIds]
  );

  const medianRow: FinRow = useMemo(() => ({
    name: 'Sector median',
    primary: '— Comparable group —',
    secondary: `${rows.length} companies`,
    country: '', hq: '', ownership: 'Public', color: 'var(--ax-cyan-700)',
    fte: sectorMedian.fte,
    revenue: sectorMedian.revenue,
    rev_growth: sectorMedian.rev_growth,
    ebitda: sectorMedian.ebitda,
    ebitda_margin: sectorMedian.ebitda_margin,
    ebit: sectorMedian.ebit,
    ev: sectorMedian.ev,
    ev_revenue: sectorMedian.ev_revenue,
    ev_ebitda: sectorMedian.ev_ebitda,
    ev_ebit: sectorMedian.ev_ebit,
    rev_multiple: sectorMedian.rev_multiple,
    trend: [],
  }), [rows.length, sectorMedian]);

  const sortedRows = useMemo(() => {
    if (!sortId) return rows;
    return [...rows].sort((a, b) => {
      const av = finRowValue(a, sortId);
      const bv = finRowValue(b, sortId);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [rows, sortId, sortDir]);

  const thBase: React.CSSProperties = {
    padding: '7px 12px', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--fg-3)', background: 'var(--ax-gray-25)',
    borderBottom: '1px solid var(--border-1)', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'auto', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.id}
                onClick={() => c.noSort ? undefined : onSort(c.id)}
                style={{
                  ...thBase,
                  textAlign: c.align,
                  cursor: c.noSort ? 'default' : 'pointer',
                  minWidth: c.minWidth,
                  width: c.sticky ? c.minWidth : 1,
                  position: c.sticky ? 'sticky' : 'static',
                  left: c.sticky ? 0 : undefined,
                  zIndex: c.sticky ? 2 : 1,
                }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: sortId === c.id ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                  {c.label}
                  {sortId === c.id && <span style={{ fontSize: 10, color: 'var(--ax-cyan-700)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </span>
              </th>
            ))}
            <th aria-hidden style={{ ...thBase, width: 'auto', padding: 0 }} />
          </tr>
        </thead>
        <tbody>
          {tweaks.showMedian && (
            <tr style={{ background: 'var(--ax-cyan-50)' }}>
              {columns.map(c => (
                <td key={c.id} style={{
                  padding: '7px 12px', textAlign: c.align,
                  borderBottom: '2px solid var(--ax-cyan-100)',
                  fontWeight: 600, color: 'var(--ax-cyan-800)',
                  position: c.sticky ? 'sticky' : 'static',
                  left: c.sticky ? 0 : undefined,
                  background: c.sticky ? 'var(--ax-cyan-50)' : undefined,
                  zIndex: c.sticky ? 2 : 1,
                  fontSize: 13, whiteSpace: 'nowrap',
                }}>
                  {c.id === 'company' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {!tweaks.hideCompanyAvatars && (
                        <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--ax-cyan-700)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>Σ</span>
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ax-cyan-800)' }}>Sector median</div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ax-cyan-700)' }}>across {rows.length} matching companies</div>
                      </div>
                    </div>
                  ) : c.id === 'sector' ? (
                    <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--ax-cyan-700)' }}>Benchmark</span>
                  ) : (
                    <Cell col={c} row={medianRow} tweaks={tweaks} currencySymbol={currencySymbol} isMedian sectorMedian={sectorMedian} />
                  )}
                </td>
              ))}
              <td aria-hidden style={{ padding: 0, width: 'auto', borderBottom: '2px solid var(--ax-cyan-100)', background: 'var(--ax-cyan-50)' }} />
            </tr>
          )}
          {sortedRows.map((row, idx) => (
            <tr key={row.name + idx}
              style={{ background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ax-gray-25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {columns.map(c => (
                <td key={c.id} style={{
                  padding: '7px 12px', textAlign: c.align,
                  borderBottom: idx === sortedRows.length - 1 ? 'none' : '1px solid var(--ax-gray-100)',
                  color: 'var(--fg-1)',
                  position: c.sticky ? 'sticky' : 'static',
                  left: c.sticky ? 0 : undefined,
                  background: c.sticky ? 'inherit' : undefined,
                  zIndex: c.sticky ? 1 : 0, whiteSpace: 'nowrap',
                }}>
                  <Cell col={c} row={row} tweaks={tweaks} currencySymbol={currencySymbol} sectorMedian={sectorMedian} />
                </td>
              ))}
              <td aria-hidden style={{ padding: 0, width: 'auto', borderBottom: idx === sortedRows.length - 1 ? 'none' : '1px solid var(--ax-gray-100)' }} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
