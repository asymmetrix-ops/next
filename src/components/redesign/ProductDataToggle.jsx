// ProductDataToggle — Row 3, column 1 (V3 only).
// Two-tab card: Product type ⇆ Data collection. Revenue model is split out
// to its own card on the right in V3.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { PctBar, WeightChip } from './_helpers.jsx';

export default function ProductDataToggle() {
  const c = COMPANY;
  const palette = [T.azure, T.lavender, T.coral, T.signal];
  const [tab, setTab] = React.useState('product');
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
        padding: '14px 16px 10px',
        borderBottom: `1px solid ${T.hair}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          {tabBtn('product', 'Product type')}
          {tabBtn('data',    'Data collection')}
        </div>
        <div style={{
          fontSize: 14, color: T.azure, fontWeight: 500,
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          lineHeight: 1, padding: '2px 4px',
        }}>→</div>
      </div>

      {tab === 'product' ? (
        <div style={{ padding: '8px 18px 14px' }}>
          {c.productType.map((p, i) => (
            <div key={p.name} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 60px',
              alignItems: 'center', gap: 12, padding: '9px 0',
              borderBottom: i === c.productType.length - 1 ? 'none' : `1px solid ${T.hair}`,
              fontSize: 12.5,
            }}>
              <div style={{ color: T.body, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: palette[i], display: 'inline-block' }} />
                {p.name}
              </div>
              <PctBar pct={p.pct} color={palette[i]} />
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.ink, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.pct}%</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '8px 16px 14px' }}>
          {c.dataCollection.map((d, i) => (
            <div key={d.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 0', borderBottom: i === c.dataCollection.length - 1 ? 'none' : `1px solid ${T.hair}`,
              fontSize: 12.5,
            }}>
              <div style={{ color: T.body }}>{d.name}</div>
              <WeightChip weight={d.weight} hideMinor />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
