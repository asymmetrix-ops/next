// ManagementCard — Row 5, column 3.
// Top 3 management table — avatar, name, role, tenure.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { LinkPanel, LinkedH } from './_helpers.jsx';

export default function ManagementCard() {
  const c = COMPANY;
  const top = c.management.slice(0, 3);
  return (
    <LinkPanel target="management">
      <LinkedH target="management">Management</LinkedH>
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 1.4fr 1fr auto',
        alignItems: 'center', gap: 10,
        padding: '8px 14px',
        background: T.paper,
        borderBottom: `1px solid ${T.hair}`,
        fontSize: 10.5, fontWeight: 500, color: T.muted,
        textTransform: 'uppercase', letterSpacing: 0.4,
      }}>
        <div></div>
        <div>Name</div>
        <div style={{ textAlign: 'center' }}>Role</div>
        <div style={{ textAlign: 'right' }}>Tenure</div>
      </div>
      <div style={{ padding: '4px 0' }}>
        {top.map((m, i) => (
          <div key={m.name} style={{
            display: 'grid', gridTemplateColumns: '32px 1.4fr 1fr auto',
            alignItems: 'center', gap: 10,
            padding: '10px 14px',
            borderBottom: i === top.length - 1 ? 'none' : `1px solid ${T.hair}`,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `oklch(86% 0.04 ${(i * 53) % 360})`,
              color: T.body, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.sans, fontWeight: 600, fontSize: 10.5, flexShrink: 0,
            }}>{m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 500, color: T.azure,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{m.name}</div>
            </div>
            <div style={{
              fontSize: 12, color: T.body, textAlign: 'center',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{m.role}</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, whiteSpace: 'nowrap', textAlign: 'right' }}>{m.tenure}</div>
          </div>
        ))}
      </div>
    </LinkPanel>
  );
}
