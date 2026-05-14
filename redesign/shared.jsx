// shared.jsx — primitives used across cards as ES module exports.
// Trimmed to just the ones the V3 cards consume: Pill, KV, Logo, Spark.

import React from 'react';
import { T } from './tokens.jsx';

// Monogram logo — deterministic tone per letter.
export function Logo({ letter = 'M', size = 40, radius = 8, style = {} }) {
  const h = [...letter].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (h * 47) % 360;
  const bg = `oklch(32% 0.08 ${hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.sans, fontWeight: 600, fontSize: size * 0.46,
      letterSpacing: -0.5, flexShrink: 0, ...style,
    }}>{letter}</div>
  );
}

// Tag / pill
export function Pill({ children, tone = 'neutral', style = {} }) {
  const tones = {
    neutral:  { bg: T.inset,             fg: T.body,     bd: T.divider },
    indigo:   { bg: T.azureSoft,         fg: T.azure,    bd: 'transparent' },
    azure:    { bg: T.azureSoft,         fg: T.azure,    bd: 'transparent' },
    lavender: { bg: T.lavenderSoft,      fg: T.lavender, bd: 'transparent' },
    coral:    { bg: T.coralSoft,         fg: T.coral,    bd: 'transparent' },
    emerald:  { bg: T.emeraldSoft,       fg: T.emerald,  bd: 'transparent' },
    signal:   { bg: T.signalSoft,        fg: T.signal,   bd: 'transparent' },
    up:       { bg: 'oklch(95% 0.05 150)', fg: T.up,     bd: 'transparent' },
    down:     { bg: 'oklch(95% 0.06 25)',  fg: T.down,   bd: 'transparent' },
    ghost:    { bg: 'transparent',        fg: T.muted,   bd: T.divider },
  }[tone] || {};
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 8px', borderRadius: 4,
      background: tones.bg, color: tones.fg,
      border: `1px solid ${tones.bd}`,
      fontFamily: T.sans, fontSize: 11.5, fontWeight: 500,
      lineHeight: 1.5, whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
}

// Key-value row (used inside OverviewCard).
export function KV({ k, v, mono = false, muted = false }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 1fr',
      gap: 10, padding: '5px 0',
      borderBottom: `1px solid ${T.hair}`,
      fontSize: 12.5,
    }}>
      <div style={{ color: T.muted, fontFamily: T.sans }}>{k}</div>
      <div style={{
        color: muted ? T.faint : T.body,
        fontFamily: mono ? T.mono : T.sans,
        fontVariantNumeric: 'tabular-nums',
      }}>{v}</div>
    </div>
  );
}

// Sparkline — tiny line chart, used inside SubsCard.
export function Spark({ data, w = 160, h = 40, stroke = T.indigo, fill = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.9 - h * 0.05;
    return [x, y];
  });
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L${w} ${h} L0 ${h} Z`;
  const id = 'sp' + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && (<>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
      </>)}
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
