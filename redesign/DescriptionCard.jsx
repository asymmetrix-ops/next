// DescriptionCard — Row 1, column 2.
// Long-form company description, with an Expand link.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { LinkPanel, LinkedH } from './_helpers.jsx';

export default function DescriptionCard() {
  const c = COMPANY;
  return (
    <LinkPanel target="description">
      <LinkedH target="description">Description</LinkedH>
      <div style={{ padding: '14px 22px 16px', fontSize: 13.5, lineHeight: 1.65, color: T.body }}>
        {c.description}
        <div style={{ marginTop: 10, color: T.azure, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>Expand →</div>
      </div>
    </LinkPanel>
  );
}
