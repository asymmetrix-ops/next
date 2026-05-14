// InsightsCard — Row 2, columns 1–2.
// Lead body text for the two most recent insights, with a pager footer.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { Pill } from './shared.jsx';
import { LinkPanel, LinkedH } from './_helpers.jsx';

export default function InsightsCard() {
  const c = COMPANY;
  const items = c.insights.slice(0, 2);
  return (
    <LinkPanel target="insights">
      <LinkedH target="insights" right={<span>2 of {c.coverageCount}</span>}>Recent insights & analysis</LinkedH>
      {items.map((it, i) => (
        <div key={i} style={{
          padding: '14px 18px',
          borderBottom: `1px solid ${T.hair}`,
          display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16,
        }}>
          <div>
            <Pill tone={i === 0 ? 'coral' : 'azure'}>{it.tag}</Pill>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 8, fontFamily: T.mono }}>{it.date}</div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: T.body }}>
            {it.body || it.dek}
            <div style={{ marginTop: 6, color: T.azure, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Open report →</div>
          </div>
        </div>
      ))}
      <div style={{
        padding: '10px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: T.sans, fontSize: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{
            width: 26, height: 26, borderRadius: 6,
            border: `1px solid ${T.divider}`, background: T.panel,
            color: T.body, fontFamily: T.sans, fontSize: 14, lineHeight: 1, cursor: 'pointer',
          }}>‹</button>
          <button style={{
            width: 26, height: 26, borderRadius: 6,
            border: `1px solid ${T.divider}`, background: T.panel,
            color: T.body, fontFamily: T.sans, fontSize: 14, lineHeight: 1, cursor: 'pointer',
          }}>›</button>
          <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 11.5 }}>
            Showing 1–2 of {c.coverageCount}
          </span>
        </div>
        <a style={{ color: T.azure, fontWeight: 500, cursor: 'pointer' }}>
          Browse all {c.coverageCount} →
        </a>
      </div>
    </LinkPanel>
  );
}
