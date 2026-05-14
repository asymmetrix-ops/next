// HeadcountCard — Row 4, column 3.
// Big headline number + SVG line chart of LinkedIn headcount over 24 months.

import React from 'react';
import { T, COMPANY } from './tokens.jsx';
import { LinkPanel, LinkedH, Delta } from './_helpers.jsx';

export default function HeadcountCard() {
  const c = COMPANY;
  const last = c.hc[c.hc.length - 1];
  const data = c.hc;
  const min = Math.min(...data);
  const max = Math.max(...data);

  // Tick step
  const range = max - min;
  const niceStep = range > 4000 ? 2000 : range > 1500 ? 1000 : range > 800 ? 500 : 200;
  const yMin = Math.floor(min / niceStep) * niceStep;
  const yMax = Math.ceil(max / niceStep) * niceStep;
  const ticks = [];
  for (let v = yMin; v <= yMax; v += niceStep) ticks.push(v);

  // Chart sizing
  const W = 460, H = 150;
  const padL = 38, padR = 8, padT = 8, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const x = (i) => padL + (i / (data.length - 1)) * innerW;
  const y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const linePath = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${x(data.length - 1)} ${padT + innerH} L${padL} ${padT + innerH} Z`;
  const gid = React.useId();

  const xLabels = ['Apr \u201924', 'Oct \u201924', 'Apr \u201925', 'Oct \u201925', 'Apr \u201926'];

  return (
    <LinkPanel target="headcount">
      <LinkedH target="headcount" right={<Delta value="+6.4% YoY" />}>LinkedIn employee count</LinkedH>
      <div style={{ padding: '20px 18px 12px' }}>
        <div style={{
          fontSize: 32, fontWeight: 600, color: T.ink,
          fontVariantNumeric: 'tabular-nums', letterSpacing: -0.6, lineHeight: 1.1,
        }}>
          {last.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
          Total full-time employees · Apr 2026
        </div>

        <div style={{ marginTop: 18 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={T.azure} stopOpacity="0.18" />
                <stop offset="100%" stopColor={T.azure} stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((t, i) => {
              const yy = y(t);
              return (
                <g key={t}>
                  <line x1={padL} x2={W - padR} y1={yy} y2={yy}
                    stroke={T.hair} strokeWidth="1" strokeDasharray={i === 0 ? '0' : '2 3'} />
                  <text x={padL - 6} y={yy + 3} textAnchor="end"
                    fontSize="9.5" fontFamily={T.mono} fill={T.faint}>
                    {t.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {xLabels.map((label, i) => {
              const xx = padL + (i / (xLabels.length - 1)) * innerW;
              return (
                <text key={label} x={xx} y={H - 6} textAnchor="middle"
                  fontSize="9.5" fontFamily={T.mono} fill={T.faint}>{label}</text>
              );
            })}

            <path d={areaPath} fill={`url(#${gid})`} />
            <path d={linePath} fill="none" stroke={T.azure}
              strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />

            <circle cx={x(data.length - 1)} cy={y(last)} r="3.5" fill={T.azure} />
            <circle cx={x(data.length - 1)} cy={y(last)} r="6"   fill={T.azure} fillOpacity="0.18" />
          </svg>
        </div>
      </div>
    </LinkPanel>
  );
}
