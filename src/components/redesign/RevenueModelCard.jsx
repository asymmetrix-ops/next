// RevenueModelCard — Row 3, column 3 (V3 lifts this into the right column).
// Rows of revenue streams with Main/Minor weighting.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { LinkPanel, LinkedH, WeightChip } from './_helpers.jsx';

export default function RevenueModelCard() {
  const c = COMPANY;
  return (
    <LinkPanel target="revenueModel">
      <LinkedH target="revenueModel">Revenue Model</LinkedH>
      <div style={{ padding: '8px 16px 14px' }}>
        {c.revenueModel.map((d, i) => (
          <div key={d.name} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 0', borderBottom: i === c.revenueModel.length - 1 ? 'none' : `1px solid ${T.hair}`,
            fontSize: 12.5,
          }}>
            <div style={{ color: T.body }}>{d.name}</div>
            <WeightChip weight={d.weight} hideMinor />
          </div>
        ))}
      </div>
    </LinkPanel>
  );
}
