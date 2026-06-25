/* =============================================================
   Benchmark — Sector vs Sector
   Heatmap matrix (sectors × metrics), a growth/margin scatter,
   and a per-metric league table.
   Renders into window.BenchmarkSector
   ============================================================= */
const { useState: sUseState, useMemo: sUseMemo, useEffect: sUseEffect, useRef: sUseRef } = React;

/* ---- small popover anchored under an element (local to sector view) ---- */
function SecPop({ anchorRef, onClose, children, width = 240 }) {
  const ref = sUseRef(null);
  const [pos, setPos] = sUseState({ top: 0, left: 0 });
  sUseEffect(() => {
    function place() {
      if (!anchorRef.current) return;
      const a = anchorRef.current.getBoundingClientRect();
      let left = a.left;
      if (left + width > window.innerWidth - 10) left = window.innerWidth - width - 10;
      setPos({ top: a.bottom + 6, left });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, []);
  sUseEffect(() => {
    function onDown(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      onClose();
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);
  return ReactDOM.createPortal(
    <div ref={ref} style={{
      position: 'fixed', top: pos.top, left: pos.left, width,
      background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-popover)', zIndex: 200, padding: 10, fontFamily: 'var(--font-sans)',
    }}>{children}</div>, document.body);
}

/* sector accent palette (cyan family + one violet for ESG) */
const SECTOR_COLOR = {
  'Investment Research & Data': '#0370AA',
  'Credit & Risk':              '#02527D',
  'ESG & Sustainability':       '#7B5CD9',
  'Capital Markets Data':       '#15A2EA',
  'Market Intelligence':        '#0788C8',
  'Compliance & RegTech':       '#54C7FF',
  'Index Providers':            '#0B6E47',
};
const colorFor = (s) => SECTOR_COLOR[s] || 'var(--ax-cyan-600)';

function BenchmarkSector({ tweaks }) {
  const [level, setLevel] = sUseState('sector');     // 'sector' | 'subSector'
  const [compareMode, setCompareMode] = sUseState('all'); // 'all' | 'focus'
  const [leagueMetric, setLeagueMetric] = sUseState('ebitda_margin');

  const allAggregates = sUseMemo(() => window.bmSectorAggregates(level), [level]);

  // hand-curated roster of entities in play, + a focus pick for one-vs-others
  const [selected, setSelected] = sUseState(() => window.bmSectorAggregates('sector').map(a => a.name));
  const [focus, setFocus] = sUseState(null);
  const [addOpen, setAddOpen] = sUseState(false);
  const [focusOpen, setFocusOpen] = sUseState(false);
  const addRef = sUseRef(null);
  const focusRef = sUseRef(null);

  // changing the grouping level resets the roster to all entities at that level
  sUseEffect(() => {
    const names = allAggregates.map(a => a.name);
    setSelected(names);
    setFocus(f => (names.includes(f) ? f : names[0]));
  }, [level]);

  const labelFor = (name) => (level === 'subSector' ? name.split(' · ')[1] : name);

  // displayed set = roster ∩ universe, with the focus pinned first in focus mode
  const aggregates = sUseMemo(() => {
    const inPlay = allAggregates.filter(a => selected.includes(a.name));
    if (compareMode === 'focus' && focus) {
      const f = inPlay.filter(a => a.name === focus);
      const rest = inPlay.filter(a => a.name !== focus);
      return [...f, ...rest];
    }
    return inPlay;
  }, [allAggregates, selected, compareMode, focus]);

  const scores = sUseMemo(() => window.bmHeatScores(aggregates), [aggregates]);
  const metrics = window.BM_SECTOR_METRICS || window.BM_METRICS;
  const focusRow = compareMode === 'focus' ? aggregates.find(a => a.name === focus) : null;

  const available = allAggregates.filter(a => !selected.includes(a.name));
  const addEntity = (name) => { setSelected(s => (s.includes(name) ? s : [...s, name])); setAddOpen(false); };
  const removeEntity = (name) => {
    setSelected(s => s.filter(n => n !== name));
    if (focus === name) setFocus(selected.filter(n => n !== name)[0] || null);
  };
  const resetRoster = () => { const names = allAggregates.map(a => a.name); setSelected(names); setFocus(names[0]); };

  /* scatter domain */
  const scatter = sUseMemo(() => {
    const xs = aggregates.map(a => a.rev_growth), ys = aggregates.map(a => a.ebitda_margin);
    const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
    const padX = (xMax - xMin) * 0.15 || 5, padY = (yMax - yMin) * 0.15 || 5;
    const revMax = Math.max(...aggregates.map(a => a.totalRevenue));
    return {
      x0: xMin - padX, x1: xMax + padX, y0: Math.max(0, yMin - padY), y1: yMax + padY,
      xMed: window.bmMedian(xs), yMed: window.bmMedian(ys), revMax,
    };
  }, [aggregates]);

  const league = sUseMemo(() => {
    const m = window.BM_METRIC_BY_ID[leagueMetric];
    const rows = aggregates.map(a => ({ name: a.name, sector: a.sector, value: a[leagueMetric], count: a.count }))
      .filter(r => r.value != null)
      .sort((p, q) => m.dir === 'high' ? q.value - p.value : p.value - q.value);
    const vals = rows.map(r => r.value);
    const lo = Math.min(...vals), hi = Math.max(...vals), span = (hi - lo) || 1;
    return rows.map(r => ({ ...r, frac: (r.value - lo) / span }));
  }, [aggregates, leagueMetric]);

  // focus mode: focus pinned first, peers in chosen order, each with a delta vs focus (no ranking)
  const focusDetail = sUseMemo(() => {
    if (compareMode !== 'focus' || !focus) return null;
    const m = window.BM_METRIC_BY_ID[leagueMetric];
    const fAgg = aggregates.find(a => a.name === focus);
    const fv = fAgg ? fAgg[leagueMetric] : null;
    const rows = aggregates.filter(a => a[leagueMetric] != null).map(a => ({
      name: a.name, sector: a.sector, value: a[leagueMetric], isFocus: a.name === focus,
      delta: (fv != null && a.name !== focus) ? a[leagueMetric] - fv : null,
    }));
    const vals = rows.map(r => r.value);
    const lo = Math.min(...vals), hi = Math.max(...vals), span = (hi - lo) || 1;
    return { metric: m, fv, rows: rows.map(r => ({ ...r, frac: (r.value - lo) / span })) };
  }, [compareMode, focus, aggregates, leagueMetric]);

  // svg scatter geometry
  const W = 520, H = 300, padL = 44, padB = 34, padT = 14, padR = 16;
  const px = v => padL + ((v - scatter.x0) / (scatter.x1 - scatter.x0)) * (W - padL - padR);
  const py = v => H - padB - ((v - scatter.y0) / (scatter.y1 - scatter.y0)) * (H - padT - padB);
  const rFor = rev => 8 + Math.sqrt(rev / scatter.revMax) * 26;

  return (
    <div>
      {/* control bar */}
      <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', padding: 10, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Group by</span>
        <div style={{ display: 'inline-flex', padding: 2, background: 'var(--ax-gray-50)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)' }}>
          {[['sector', 'Sector'], ['subSector', 'Sub-sector']].map(([v, l]) => (
            <button key={v} onClick={() => setLevel(v)} style={{
              padding: '5px 12px', border: 'none', background: level === v ? 'white' : 'transparent', color: level === v ? 'var(--fg-1)' : 'var(--fg-2)',
              fontWeight: level === v ? 600 : 500, fontSize: 13, borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              boxShadow: level === v ? '0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border-1)' : 'none',
            }}>{l}</button>
          ))}
        </div>

        <span style={{ width: 1, height: 20, background: 'var(--border-1)' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Compare</span>
        <div style={{ display: 'inline-flex', padding: 2, background: 'var(--ax-gray-50)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)' }}>
          {[['all', 'All vs all'], ['focus', 'One vs peers']].map(([v, l]) => (
            <button key={v} onClick={() => setCompareMode(v)} style={{
              padding: '5px 12px', border: 'none', background: compareMode === v ? 'white' : 'transparent', color: compareMode === v ? 'var(--fg-1)' : 'var(--fg-2)',
              fontWeight: compareMode === v ? 600 : 500, fontSize: 13, borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              boxShadow: compareMode === v ? '0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border-1)' : 'none',
            }}>{l}</button>
          ))}
        </div>

        {compareMode === 'focus' && (
          <React.Fragment>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Focus on</span>
            <button ref={focusRef} onClick={() => setFocusOpen(v => !v)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 8px', background: 'var(--ax-cyan-50)',
              border: '1px solid var(--border-brand)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(focusRow ? focusRow.sector : ''), flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg-1)' }}>{focus ? labelFor(focus) : 'Pick one'}</span>
              <svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 5l3 3 3-3" stroke="var(--fg-3)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {focusOpen && (
              <SecPop anchorRef={focusRef} onClose={() => setFocusOpen(false)} width={250}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Set focus</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280, overflowY: 'auto' }}>
                  {aggregates.map(a => (
                    <button key={a.name} onClick={() => { setFocus(a.name); setFocusOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '6px 7px', border: 'none', background: a.name === focus ? 'var(--ax-cyan-50)' : 'transparent', borderRadius: 6, fontSize: 13, color: 'var(--fg-1)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(a.sector), flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{labelFor(a.name)}</span>
                    </button>
                  ))}
                </div>
              </SecPop>
            )}
          </React.Fragment>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-3)' }}>{compareMode === 'focus' ? <span><strong style={{ color: 'var(--fg-1)' }}>{focus ? labelFor(focus) : '—'}</strong> vs {Math.max(0, aggregates.length - 1)} chosen peers</span> : <span>Cells show <strong style={{ color: 'var(--fg-1)' }}>median</strong> · colored by relative performance per metric</span>}</span>
      </div>

      {/* roster: hand-pick which groups are in play, regardless of filters */}
      <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{level === 'sector' ? 'Sectors' : 'Sub-sectors'} in play</span>
          <span style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{compareMode === 'focus' ? 'Pick the peer set to compare your focus against — all medians recompute against just these.' : 'Add or drop groups by hand — every median and color recalculates across only what is shown.'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {aggregates.map(a => {
            const isFocus = compareMode === 'focus' && a.name === focus;
            return (
              <span key={a.name} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 4px 4px 8px',
                background: isFocus ? 'var(--ax-cyan-50)' : 'var(--ax-gray-50)',
                border: '1px solid ' + (isFocus ? 'var(--border-brand)' : 'var(--border-1)'),
                borderRadius: 'var(--r-md)', fontSize: 13,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(a.sector), flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{labelFor(a.name)}</span>
                {isFocus && <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ax-cyan-700)', letterSpacing: '0.04em' }}>FOCUS</span>}
                <button onClick={() => removeEntity(a.name)} title="Remove" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-4)', padding: 2, lineHeight: 0, borderRadius: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </span>
            );
          })}
          {aggregates.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--fg-4)', fontStyle: 'italic' }}>Nothing selected — add a {level === 'sector' ? 'sector' : 'sub-sector'}.</span>}
          <button ref={addRef} onClick={() => setAddOpen(v => !v)} disabled={available.length === 0} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'white',
            border: '1px dashed var(--border-2)', borderRadius: 'var(--r-md)', cursor: available.length === 0 ? 'default' : 'pointer', fontSize: 13, color: available.length === 0 ? 'var(--fg-4)' : 'var(--fg-2)', fontWeight: 600, fontFamily: 'var(--font-sans)', opacity: available.length === 0 ? 0.5 : 1,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            Add {level === 'sector' ? 'sector' : 'sub-sector'}
          </button>
          {available.length > 0 && addOpen && (
            <SecPop anchorRef={addRef} onClose={() => setAddOpen(false)} width={250}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Add to comparison</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280, overflowY: 'auto' }}>
                {available.map(a => (
                  <button key={a.name} onClick={() => addEntity(a.name)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '6px 7px', border: 'none', background: 'transparent', borderRadius: 6, fontSize: 13, color: 'var(--fg-1)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ax-gray-50)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(a.sector), flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{labelFor(a.name)}</span>
                    {level === 'subSector' && <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--fg-4)' }}>{a.name.split(' · ')[0]}</span>}
                  </button>
                ))}
              </div>
            </SecPop>
          )}
          <button onClick={resetRoster} style={{ border: 'none', background: 'transparent', color: 'var(--fg-link)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Reset</button>
        </div>
      </div>

      {/* heatmap */}
      <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ background: 'var(--ax-gray-25)' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-3)', borderBottom: '1px solid var(--border-1)', minWidth: 220, position: 'sticky', left: 0, background: 'var(--ax-gray-25)' }}>{level === 'sector' ? 'Sector' : 'Sub-sector'}</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: 10.5, fontWeight: 700, color: 'var(--fg-3)', borderBottom: '1px solid var(--border-1)' }}>n</th>
                {metrics.map(m => (
                  <th key={m.id} style={{ textAlign: 'center', padding: '10px 10px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--fg-3)', borderBottom: '1px solid var(--border-1)', minWidth: 78 }}>
                    {m.short}<div style={{ fontSize: 9, fontWeight: 500, color: 'var(--fg-4)', textTransform: 'none', letterSpacing: 0 }}>{m.dir === 'high' ? '↑ better' : '↓ better'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aggregates.map((a, ri) => {
                const isFocus = compareMode === 'focus' && a.name === focus;
                const cellBg = isFocus ? 'var(--ax-cyan-50)' : 'white';
                return (
                <tr key={a.name} style={isFocus ? { boxShadow: 'inset 3px 0 0 var(--ax-cyan-600)' } : null}>
                  <td style={{ padding: '9px 16px', borderBottom: ri === aggregates.length - 1 ? 'none' : '1px solid var(--ax-gray-100)', position: 'sticky', left: 0, background: cellBg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: colorFor(a.sector), flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: isFocus ? 700 : 600, color: 'var(--fg-1)' }}>{level === 'subSector' ? a.name.split(' · ')[1] : a.name}</span>
                      {level === 'subSector' && <span style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{a.name.split(' · ')[0]}</span>}
                      {isFocus && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ax-cyan-700)', letterSpacing: '0.05em', background: 'white', border: '1px solid var(--border-brand)', borderRadius: 3, padding: '1px 4px' }}>FOCUS</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '9px 8px', fontSize: 12, color: 'var(--fg-3)', borderBottom: ri === aggregates.length - 1 ? 'none' : '1px solid var(--ax-gray-100)', fontVariantNumeric: 'tabular-nums', background: cellBg }}>{a.count}</td>
                  {metrics.map(m => {
                    const heat = window.bmHeat(scores[m.id][a.name]);
                    return (
                      <td key={m.id} style={{ textAlign: 'center', padding: 0, borderBottom: ri === aggregates.length - 1 ? 'none' : '1px solid white', background: cellBg }}>
                        <div style={{ margin: 2, padding: '9px 6px', background: heat.bg, color: heat.fg, borderRadius: 5, fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {window.fmtMetric(a[m.id], m.unit)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* scatter + league side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* scatter */}
        <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-1)' }}>Growth vs profitability</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2, marginBottom: 8 }}>Revenue growth (x) vs EBITDA margin (y) · bubble = aggregate revenue</div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            {/* quadrant median lines */}
            <line x1={px(scatter.xMed)} y1={padT} x2={px(scatter.xMed)} y2={H - padB} stroke="var(--ax-gray-200)" strokeDasharray="3 3" />
            <line x1={padL} y1={py(scatter.yMed)} x2={W - padR} y2={py(scatter.yMed)} stroke="var(--ax-gray-200)" strokeDasharray="3 3" />
            {/* axes */}
            <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border-2)" />
            <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--border-2)" />
            {/* axis labels */}
            <text x={(W + padL) / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--fg-4)" fontFamily="var(--font-sans)">Revenue growth →</text>
            <text x={-(H - padB + padT) / 2} y={12} transform="rotate(-90)" textAnchor="middle" fontSize="10" fill="var(--fg-4)" fontFamily="var(--font-sans)">EBITDA margin →</text>
            {/* x ticks */}
            {[scatter.x0, scatter.xMed, scatter.x1].map((v, i) => (
              <text key={i} x={px(v)} y={H - padB + 14} textAnchor="middle" fontSize="9.5" fill="var(--fg-4)" fontFamily="var(--font-mono)">{Math.round(v)}%</text>
            ))}
            {[scatter.y0, scatter.yMed, scatter.y1].map((v, i) => (
              <text key={i} x={padL - 6} y={py(v) + 3} textAnchor="end" fontSize="9.5" fill="var(--fg-4)" fontFamily="var(--font-mono)">{Math.round(v)}%</text>
            ))}
            {/* bubbles */}
            {aggregates.map(a => {
              const r = rFor(a.totalRevenue);
              const c = colorFor(a.sector);
              const isFocus = compareMode === 'focus' && a.name === focus;
              const label = level === 'subSector' ? a.name.split(' · ')[1] : a.name;
              return (
                <g key={a.name} opacity={compareMode === 'focus' && !isFocus ? 0.55 : 1}>
                  <circle cx={px(a.rev_growth)} cy={py(a.ebitda_margin)} r={r} fill={c} fillOpacity={isFocus ? 0.32 : 0.18} stroke={c} strokeWidth={isFocus ? 2.5 : 1.5} />
                  <circle cx={px(a.rev_growth)} cy={py(a.ebitda_margin)} r={isFocus ? 3.5 : 2.5} fill={c} />
                  <text x={px(a.rev_growth)} y={py(a.ebitda_margin) - r - 3} textAnchor="middle" fontSize={isFocus ? 10.5 : 9.5} fontWeight={isFocus ? 700 : 600} fill={isFocus ? 'var(--fg-1)' : 'var(--fg-2)'} fontFamily="var(--font-sans)">{label.length > 16 ? label.slice(0, 15) + '…' : label}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* league table / focus detail */}
        <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-1)' }}>{compareMode === 'focus' ? 'Vs ' + (focus ? labelFor(focus) : 'focus') : 'League table'}</div>
            <select value={leagueMetric} onChange={e => setLeagueMetric(e.target.value)} style={{ padding: '5px 8px', border: '1px solid var(--border-1)', borderRadius: 6, fontSize: 12.5, fontFamily: 'var(--font-sans)', color: 'var(--fg-1)', background: 'white', fontWeight: 600 }}>
              {metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2, marginBottom: 10 }}>{compareMode === 'focus'
            ? <span>Each peer's median vs <strong style={{ color: 'var(--fg-1)' }}>{focus ? labelFor(focus) : '—'}</strong> · {window.BM_METRIC_BY_ID[leagueMetric].dir === 'high' ? 'higher is better' : 'lower is better'}</span>
            : <span>Ranked by median · {window.BM_METRIC_BY_ID[leagueMetric].dir === 'high' ? 'highest first' : 'lowest (cheapest) first'}</span>}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {compareMode === 'focus' && focusDetail && focusDetail.rows.map(r => {
              const good = r.delta == null ? null : (focusDetail.metric.dir === 'high' ? r.delta >= 0 : r.delta <= 0);
              return (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colorFor(r.sector), flexShrink: 0 }} />
                  <span style={{ flex: '0 0 130px', fontSize: 12.5, fontWeight: r.isFocus ? 700 : 600, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{labelFor(r.name)}{r.isFocus && <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: 'var(--ax-cyan-700)' }}>FOCUS</span>}</span>
                  <div style={{ flex: 1, height: 16, background: 'var(--ax-gray-50)', borderRadius: 4, overflow: 'hidden', outline: r.isFocus ? '1.5px solid var(--ax-cyan-600)' : 'none' }}>
                    <div style={{ width: Math.max(4, r.frac * 100) + '%', height: '100%', background: colorFor(r.sector), opacity: r.isFocus ? 1 : 0.7, borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 50, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{window.fmtMetric(r.value, focusDetail.metric.unit)}</span>
                  <span style={{ width: 56, textAlign: 'right', fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: r.delta == null ? 'var(--fg-4)' : good ? 'var(--ax-positive)' : 'var(--ax-negative)' }}>{r.delta == null ? '—' : window.fmtSigned(r.delta, focusDetail.metric.unit)}</span>
                </div>
              );
            })}
            {compareMode !== 'focus' && league.map((r, i) => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 16, textAlign: 'right', fontSize: 11.5, fontWeight: 700, color: i === 0 ? 'var(--ax-positive)' : 'var(--fg-4)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: colorFor(r.sector), flexShrink: 0 }} />
                <span style={{ flex: '0 0 130px', fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{level === 'subSector' ? r.name.split(' · ')[1] : r.name}</span>
                <div style={{ flex: 1, height: 16, background: 'var(--ax-gray-50)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: Math.max(4, r.frac * 100) + '%', height: '100%', background: colorFor(r.sector), opacity: 0.85, borderRadius: 4 }} />
                </div>
                <span style={{ width: 54, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{window.fmtMetric(r.value, window.BM_METRIC_BY_ID[leagueMetric].unit)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* heat legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 11.5, color: 'var(--fg-3)' }}>
        <span>Per metric:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 22, height: 13, borderRadius: 3, background: window.bmHeat(0).bg, border: '1px solid var(--border-1)' }} />
          <span style={{ width: 22, height: 13, borderRadius: 3, background: window.bmHeat(0.5).bg, border: '1px solid var(--border-1)' }} />
          <span style={{ width: 22, height: 13, borderRadius: 3, background: window.bmHeat(1).bg, border: '1px solid var(--border-1)' }} />
        </span>
        <span style={{ color: 'var(--fg-4)' }}>worst → best (direction-aware)</span>
      </div>
    </div>
  );
}

window.BenchmarkSector = BenchmarkSector;
