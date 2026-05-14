// SubsCard — Row 5, columns 1–2.
// Subsidiaries table — logo + name, sector, country, headcount, LinkedIn sparkline.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { Logo, Spark } from './shared.jsx';
import { LinkPanel, LinkedH } from './_helpers.jsx';

export default function SubsCard() {
  const c = COMPANY;
  return (
    <LinkPanel target="subs">
      <LinkedH target="subs">Current subsidiaries</LinkedH>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: T.paper }}>
            {[
              { label: 'Company',         align: 'left'   },
              { label: 'Sector',          align: 'left'   },
              { label: 'Country',         align: 'center' },
              { label: 'Headcount',       align: 'center' },
              { label: 'LinkedIn growth', align: 'left'   },
            ].map(h => (
              <th key={h.label} style={{
                textAlign: h.align, padding: '9px 14px', color: T.muted, fontSize: 10.5,
                fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4,
                borderBottom: `1px solid ${T.hair}`,
              }}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {c.subs.map((s, i) => (
            <tr key={i} style={{ borderBottom: i === c.subs.length - 1 ? 'none' : `1px solid ${T.hair}` }}>
              <td style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Logo letter={s.name[0]} size={22} radius={5} />
                  <span style={{ fontWeight: 500, color: T.ink }}>{s.name}</span>
                </div>
              </td>
              <td style={{ padding: '10px 14px', color: T.muted }}>{s.sector}</td>
              <td style={{ padding: '10px 14px', fontFamily: T.mono, color: T.body, textAlign: 'center' }}>{s.country}</td>
              <td style={{ padding: '10px 14px', fontFamily: T.mono, color: T.body, textAlign: 'center' }}>{s.employees.toLocaleString()}</td>
              <td style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Spark data={[100, 104, 107, 109, 112, 118, 124, 129]} w={70} h={20} />
                  <span style={{ fontFamily: T.mono, color: T.up, fontSize: 11 }}>+{[9, 4, 12, 3][i]}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </LinkPanel>
  );
}
