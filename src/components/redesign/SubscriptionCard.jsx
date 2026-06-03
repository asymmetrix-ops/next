// SubscriptionCard — Row 2, column 3.
// ARR / NRR / GDR / upsell mini-rows. In V3 this is raised from row 3 to row 2.

import React from 'react';
import { COMPANY } from './tokens.jsx';
import { LinkPanel, LinkedH, MiniKV, Delta } from './_helpers.jsx';

export default function SubscriptionCard() {
  const c = COMPANY;
  return (
    <LinkPanel target="subscription">
      <LinkedH target="subscription">Subscription Metrics</LinkedH>
      <div style={{ padding: '8px 16px 14px' }}>
        <MiniKV k="Recurring rev" v={`US$ ${c.arr}`} mono />
        <MiniKV k="ARR growth"    v={<Delta value="+9.1%" />} />
        <MiniKV k="NRR"           v={c.nrr} mono />
        <MiniKV k="GDR"           v={c.gdr} mono />
        <MiniKV k="Upsell"        v="14%" mono />
        <MiniKV k="New logos"     v="+428 QoQ" mono last />
      </div>
    </LinkPanel>
  );
}
