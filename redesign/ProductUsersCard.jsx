// ProductUsersCard — Row 3, column 2.
// Accordion of user segments — accountants, corporate tax depts, attorneys, advisors.
// Self-contained: the user groups + copy live inside the component.

import React from 'react';
import { T } from './tokens.jsx';
import { LinkPanel, LinkedH } from './_helpers.jsx';

export default function ProductUsersCard() {
  const groups = [
    {
      title: 'Accounting & Tax Firms',
      blurb: 'The primary user base. CPAs, enrolled agents and tax preparers at firms of all sizes — from solo practitioners to top-25 U.S. accounting firms — use the platform to:',
      bullets: [
        'Perform instant tax research on complex federal, state and multi-jurisdictional questions',
        'Draft tax memos, client communications, IRS notice responses and engagement letters',
        'Run AI-powered return reviews to catch errors, audit risks and missed savings before filing',
        'Manage client documents, entity structures and filing histories in a centralised intelligence layer',
      ],
    },
    {
      title: 'Corporate Tax Departments',
      blurb: 'Use the platform for internal tax compliance, research automation and documentation standardisation. Handles federal, state and international tax law analysis while maintaining audit trails and compliance documentation.',
    },
    {
      title: 'Tax Attorneys',
      blurb: 'Leverage the platform for rapid legal research, client advisory work and preparation of opinion letters and legal memoranda. Citation-backed output structure aligns with the evidentiary standards required in legal practice.',
    },
    {
      title: 'Financial Advisors & Wealth Managers',
      blurb: 'Deliver real-time, personalised tax guidance to clients, supporting proactive tax planning and expanding the advisory scope of wealth management services.',
    },
  ];

  const [open, setOpen] = React.useState(() => groups.map(() => false));
  const toggle = (i, e) => {
    e.stopPropagation();
    setOpen(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  return (
    <LinkPanel target="productType">
      <LinkedH target="productType">Product & Users</LinkedH>
      <div style={{ padding: '4px 0 6px' }}>
        {groups.map((g, i) => {
          const isOpen = open[i];
          return (
            <div key={g.title} style={{
              borderBottom: i === groups.length - 1 ? 'none' : `1px solid ${T.hair}`,
            }}>
              <button
                onClick={(e) => toggle(i, e)}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  padding: '12px 18px', cursor: 'pointer', textAlign: 'left',
                  display: 'grid', gridTemplateColumns: '20px 1fr 18px',
                  alignItems: 'center', gap: 8, fontFamily: T.sans,
                }}
              >
                <span style={{
                  fontFamily: T.mono, fontSize: 11, color: T.muted, fontWeight: 500,
                }}>{i + 1}.</span>
                <span style={{
                  fontFamily: T.sans, fontWeight: 600, fontSize: 13.5, color: T.ink,
                }}>{g.title}</span>
                <span style={{
                  fontSize: 12, color: T.muted, textAlign: 'center',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 160ms',
                  display: 'inline-block', lineHeight: 1,
                }}>›</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 18px 14px 46px', fontSize: 13, lineHeight: 1.6, color: T.body }}>
                  <div>{g.blurb}</div>
                  {g.bullets && (
                    <ul style={{
                      margin: '6px 0 0 0', padding: 0, listStyle: 'none',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      {g.bullets.map(b => (
                        <li key={b} style={{
                          display: 'grid', gridTemplateColumns: '14px 1fr', gap: 4,
                          color: T.body, fontSize: 12.5, lineHeight: 1.55,
                        }}>
                          <span style={{ color: T.azure, fontWeight: 600 }}>•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </LinkPanel>
  );
}
