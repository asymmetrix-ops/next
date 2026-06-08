// OverviewCard — Row 1, column 1.
// Sector tags + key facts (ownership, lifecycle, HQ, raised, employees).

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { KV } from './shared.jsx';
import { LinkPanel, LinkedH, TagRow, Delta } from './_helpers.jsx';

export default function OverviewCard() {
  const c = COMPANY;
  return (
    <LinkPanel target="overview">
      <LinkedH target="overview">Overview</LinkedH>
      <div style={{ padding: '4px 18px 12px' }}>
        <KV k="Primary sector(s)" v={
          <TagRow items={['Company Data', 'Credit', 'Financial']} tone="coral" max={3} />
        } />
        <KV k="Secondary sector(s)" v={
          <TagRow items={c.secondary} tone="lavender" max={2} />
        } />
        <KV k="Year founded" v={c.founded} />
        <KV k="Website"      v={<a style={{ color: T.azure, textDecoration: 'none' }}>{c.website}</a>} />
        <KV k="Ownership"    v="Public" />
        <KV k="HQ"           v={c.hq} />
        <KV k="Lifecycle stage" v="Mature" />
        <KV k="Total amount raised" v={<span style={{ fontFamily: T.mono }}>$10m</span>} />
        <KV k="Employees"    v={<span>{c.employees} <Delta value="+6.4% YoY" /></span>} />
      </div>
    </LinkPanel>
  );
}
