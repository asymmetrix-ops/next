// _helpers.jsx — internal helpers + SUMMARY_LINKS map used by every card.

import React from 'react';
import { T } from './tokens.jsx';
import { Pill } from './shared.jsx';

// Sub-section map — every card targets one of these keys.
export const SUMMARY_LINKS = {
  overview:       { section: 'Overview',    blurb: 'Sector tags, ownership, lifecycle, raise history' },
  description:    { section: 'Overview',    blurb: 'Long-form description, history, narrative' },
  productType:    { section: 'Products',    blurb: 'Product mix, modules, packaging, pricing' },
  dataCollection: { section: 'Methodology', blurb: 'How Asymmetrix collects & verifies data on this co.' },
  revenueModel:   { section: 'Financials',  blurb: 'Revenue model, segment splits, model deep-dive' },
  management:     { section: 'People',      blurb: 'Full management table, tenure, LinkedIn signals' },
  insights:       { section: 'Insights',    blurb: 'All Asymmetrix research notes & analyst opinions' },
  events:         { section: 'Deals',       blurb: 'Acquisitions, divestitures, partnerships, advisors' },
  subs:           { section: 'Ownership',   blurb: 'Subsidiary tree, ownership chain, headcount' },
  financials:     { section: 'Financials',  blurb: 'Full P&L, multiples, peer set, valuation' },
  income:         { section: 'Financials',  blurb: 'Income statement, balance sheet, cash flow' },
  subscription:   { section: 'Financials',  blurb: 'ARR, NRR, GDR, cohorts, retention curves' },
  headcount:      { section: 'Market',      blurb: 'LinkedIn headcount trend, function mix, geography' },
};

// Auto-toned pill for a percentage or signed number.
export function Delta({ value, tone = 'auto' }) {
  let t = tone;
  if (tone === 'auto') {
    const num = parseFloat(String(value).replace(/[^\-0-9.]/g, ''));
    t = num > 0 ? 'up' : num < 0 ? 'down' : 'neutral';
  }
  return <Pill tone={t === 'up' ? 'up' : t === 'down' ? 'down' : 'ghost'}>{value}</Pill>;
}

// Header bar that lives at the top of every LinkPanel.
export function LinkedH({ children, target, right, level = 'panel' }) {
  const t = target ? SUMMARY_LINKS[target] : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: level === 'panel' ? '14px 16px 12px' : '12px 14px 10px',
      borderBottom: `1px solid ${T.hair}`,
    }}>
      <div style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 600, color: T.ink }}>{children}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {right && <div style={{ fontSize: 11.5, color: T.muted }}>{right}</div>}
        {t && (
          <div style={{
            fontSize: 14, color: T.azure, fontWeight: 500,
            display: 'flex', alignItems: 'center', cursor: 'pointer',
            lineHeight: 1, padding: '2px 4px',
          }}>→</div>
        )}
      </div>
    </div>
  );
}

// The hoverable panel shell every card sits in.
export function LinkPanel({ children, target }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: T.panel,
        border: `1px solid ${hover ? 'oklch(82% 0.07 258)' : T.divider}`,
        borderRadius: T.rLg, overflow: 'hidden',
        boxShadow: hover ? '0 4px 20px rgba(35,80,200,0.06)' : 'none',
        transition: 'box-shadow 160ms, border-color 160ms, transform 160ms',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        cursor: 'pointer', position: 'relative',
        width: '100%', height: '100%',
      }}>
      {children}
    </div>
  );
}

// Main/Minor weight indicator used in product/revenue/data rows.
export function WeightChip({ weight, hideMinor = false }) {
  if (weight === 'Main') return <Pill tone="azure">Main</Pill>;
  if (hideMinor) return null;
  return <Pill tone="ghost">Minor</Pill>;
}

// Inline % bar used in product-type rows.
export function PctBar({ pct, color }) {
  return (
    <div style={{ height: 6, background: T.inset, borderRadius: 3, overflow: 'hidden', width: 90 }}>
      <div style={{ width: `${Math.min(100, pct * 2)}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  );
}

// Compact two-column row used in right-rail cards (FinMetrics, Subscription…).
export function MiniKV({ k, v, last = false, mono = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 0', borderBottom: last ? 'none' : `1px solid ${T.hair}`,
      fontSize: 12.5,
    }}>
      <div style={{ color: T.muted }}>{k}</div>
      <div style={{ color: T.ink, fontFamily: mono ? T.mono : T.sans, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{v}</div>
    </div>
  );
}

// Tag row with overflow "+N" pill and hover tooltip listing the hidden ones.
export function TagRow({ items, tone = 'neutral', max = 3 }) {
  const visible = items.slice(0, max);
  const hidden = items.slice(max);
  const [hover, setHover] = React.useState(false);
  return (
    <span style={{
      display: 'flex', gap: 4, flexWrap: 'nowrap',
      whiteSpace: 'nowrap', alignItems: 'center', minWidth: 0,
    }}>
      {visible.map(s => <Pill key={s} tone={tone}>{s}</Pill>)}
      {hidden.length > 0 && (
        <span
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ position: 'relative', cursor: 'default' }}
        >
          <Pill tone="ghost">+{hidden.length}</Pill>
          {hover && (
            <span style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: T.ink, color: '#fff',
              fontFamily: T.sans, fontSize: 11.5,
              padding: '6px 10px', borderRadius: 6,
              boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
              whiteSpace: 'nowrap', zIndex: 20, lineHeight: 1.55,
            }}>
              {hidden.map(h => (<div key={h}>{h}</div>))}
              <span style={{
                position: 'absolute', top: -4, right: 14,
                width: 8, height: 8, background: T.ink,
                transform: 'rotate(45deg)',
              }} />
            </span>
          )}
        </span>
      )}
    </span>
  );
}
