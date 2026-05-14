// EventsCard — Row 4, columns 1–2.
// Corporate events table — date, type pill, target, sector, amount.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { Pill } from './shared.jsx';
import { LinkPanel, LinkedH } from './_helpers.jsx';

export default function EventsCard() {
  const c = COMPANY;
  return (
    <LinkPanel target="events">
      <LinkedH target="events">Corporate events</LinkedH>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: T.paper }}>
            {[
              { label: 'Date',                    align: 'left'   },
              { label: 'Type',                    align: 'left'   },
              { label: 'Target / Counterparty',   align: 'left'   },
              { label: 'Sector',                  align: 'left'   },
              { label: 'Amount',                  align: 'center' },
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
          {c.events.map((e, i) => (
            <tr key={i} style={{ borderBottom: i === c.events.length - 1 ? 'none' : `1px solid ${T.hair}` }}>
              <td style={{ padding: '10px 14px', fontFamily: T.mono, color: T.body }}>{e.date}</td>
              <td style={{ padding: '10px 14px' }}>
                <Pill tone={e.type === 'Acquisition' ? 'azure' : e.type === 'Divestiture' ? 'down' : 'lavender'}>{e.type}</Pill>
              </td>
              <td style={{ padding: '10px 14px', color: T.ink, fontWeight: 500 }}>{e.target}</td>
              <td style={{ padding: '10px 14px', color: T.muted }}>{i === 1 ? 'Information Services' : 'Data & Analytics'}</td>
              <td style={{ padding: '10px 14px', fontFamily: T.mono, textAlign: 'center', color: T.body }}>{e.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LinkPanel>
  );
}
