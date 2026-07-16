// SubscriptionCard — Row 2, column 3.
// NRR / GDR / upsell mini-rows. In V3 this is raised from row 3 to row 2.

import React from 'react';
import { COMPANY } from './tokens.jsx';
import { LinkPanel, LinkedH, MiniKV } from './_helpers.jsx';

export default function SubscriptionCard() {
  const c = COMPANY;
  return (
    <LinkPanel target="subscription">
      <LinkedH target="subscription">Subscription Metrics</LinkedH>
      <div style={{ padding: '8px 16px 14px' }}>
        <MiniKV k="NRR"           v={c.nrr} mono />
        <MiniKV k="GDR"           v={c.gdr} mono />
        <MiniKV k="Upsell"        v="14%" mono />
        <MiniKV k="New logos"     v="+428 QoQ" mono last />
      </div>
    </LinkPanel>
  );
}
