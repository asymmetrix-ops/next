// FinMetricsIncomeCard — Row 1, column 3 (V3 only).
// Three-tab card: Financial metrics · Benchmark vs peers · Income statement.
// V3 collapses the standalone IncomeCard into this card as a third tab.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { Pill } from './shared.jsx';
import { MiniKV } from './_helpers.jsx';

export default function FinMetricsIncomeCard() {
  const c = COMPANY;
  const [tab, setTab] = React.useState('metrics');
  const [hover, setHover] = React.useState(false);

  const tabBtn = (id, label) => (
    <button
      onClick={(e) => { e.stopPropagation(); setTab(id); }}
      style={{
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: T.sans, fontSize: 13.5, fontWeight: 600,
        color: tab === id ? T.ink : T.muted,
        borderBottom: `2px solid ${tab === id ? T.azure : 'transparent'}`,
        paddingBottom: 4, transition: 'color 120ms, border-color 120ms',
      }}
    >{label}</button>
  );

  const peers = {
    'Enterprise value':  '$6.2bn',
    'EV / Revenue':      '4.8x',
    'EV / EBITDA':       '17.2x',
    'Revenue growth':    '+7.3%',
    'EBITDA margin':     '24.0%',
    'Rule of 40':        '31',
    'Recurring revenue': '$1.2bn',
    'NRR':               '105%',
  };
  const rows = [
    ['Enterprise value',  `$${c.ev}`],
    ['EV / Revenue',      c.evRev],
    ['EV / EBITDA',       c.evEbitda],
    ['Revenue growth',    c.revGrowth],
    ['EBITDA margin',     `${c.fin[0].marg}%`],
    ['Rule of 40',        c.rule40],
    ['Recurring revenue', `$${c.arr}`],
    ['NRR',               c.nrr],
  ];

  function deltaTone(mine, peer) {
    const num = (s) => { const m = String(s).match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; };
    const a = num(mine), b = num(peer);
    if (a == null || b == null) return 'neutral';
    return a > b ? 'up' : a < b ? 'down' : 'neutral';
  }

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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px', borderBottom: `1px solid ${T.hair}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          {tabBtn('metrics', 'Financial metrics')}
          {tabBtn('peers',   'Benchmark vs peers')}
          {tabBtn('income',  'Income statement')}
        </div>
        <div style={{
          fontSize: 14, color: T.azure, fontWeight: 500,
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          lineHeight: 1, padding: '2px 4px',
        }}>→</div>
      </div>

      {tab === 'metrics' ? (
        <div style={{ padding: '8px 16px 14px' }}>
          {rows.map(([k, v], i) => (
            <MiniKV key={k} k={k} v={v} mono last={i === rows.length - 1} />
          ))}
        </div>
      ) : tab === 'peers' ? (
        <div style={{ padding: '6px 16px 14px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 56px',
            gap: 8, padding: '8px 0 6px',
            borderBottom: `1px solid ${T.hair}`,
            fontSize: 10, color: T.muted, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: 0.4,
          }}>
            <div>Metric</div>
            <div style={{ textAlign: 'right' }}>Morningstar</div>
            <div style={{ textAlign: 'right' }}>Peer median</div>
            <div style={{ textAlign: 'center' }}>vs.</div>
          </div>
          {rows.map(([k, v], i) => {
            const peer = peers[k];
            const tone = deltaTone(v, peer);
            return (
              <div key={k} style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 56px',
                gap: 8, padding: '9px 0',
                borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${T.hair}`,
                fontSize: 12.5, alignItems: 'center',
              }}>
                <div style={{ color: T.muted }}>{k}</div>
                <div style={{ textAlign: 'right', fontFamily: T.mono, color: T.ink, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{v}</div>
                <div style={{ textAlign: 'right', fontFamily: T.mono, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{peer}</div>
                <div style={{ textAlign: 'center' }}>
                  <Pill tone={tone === 'up' ? 'up' : tone === 'down' ? 'down' : 'ghost'}>
                    {tone === 'up' ? '▲' : tone === 'down' ? '▼' : '–'}
                  </Pill>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 10, fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
            Peers: S&P Global, MSCI, FactSet, Moody&apos;s Analytics, Verisk. Median across 5 firms.
          </div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr>
              {['Period', 'Rev', 'EBIT', 'EBITDA'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '8px 14px', color: T.muted, fontSize: 10, fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `1px solid ${T.hair}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.fin.map((f, i) => (
              <tr key={i} style={{ borderBottom: i === c.fin.length - 1 ? 'none' : `1px solid ${T.hair}` }}>
                <td style={{ padding: '8px 14px', fontFamily: T.mono, color: T.body }}>{f.period}</td>
                <td style={{ padding: '8px 14px', fontFamily: T.mono, textAlign: 'right', color: T.ink }}>{f.rev.toLocaleString()}</td>
                <td style={{ padding: '8px 14px', fontFamily: T.mono, textAlign: 'right', color: T.ink }}>{f.ebit}</td>
                <td style={{ padding: '8px 14px', fontFamily: T.mono, textAlign: 'right', color: T.ink }}>{f.ebitda}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
