/* =============================================================
   Benchmark — Company vs Peers
   Target company pinned, editable peer-pool filters, headline
   metric cards, and a scorecard with distribution bars + rank.
   Renders into window.BenchmarkCompany
   ============================================================= */
const { useState: cUseState, useMemo: cUseMemo, useRef: cUseRef, useEffect: cUseEffect } = React;

/* ---- small popover anchored under an element ---- */
function BmPop({ anchorRef, onClose, children, width = 260 }) {
  const ref = cUseRef(null);
  const [pos, setPos] = cUseState({ top: 0, left: 0 });
  cUseEffect(() => {
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
  cUseEffect(() => {
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

/* ---- filter value summary ---- */
function summarize(f) {
  if (Array.isArray(f.value)) return f.value.join(', ');
  if (f.value && typeof f.value === 'object') {
    const fmt = f.fmt === 'rev' ? window.fmtRevenue : (v) => v + (f.unit || '');
    const { min, max } = f.value;
    if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
    if (min != null) return `≥ ${fmt(min)}`;
    if (max != null) return `≤ ${fmt(max)}`;
  }
  return 'Any';
}

/* ---- filter editor popover body ---- */
function FilterEditorBody({ def, value, onChange }) {
  if (def.editor === 'enum') {
    const cur = Array.isArray(value) ? value : [];
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{def.label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 240, overflowY: 'auto' }}>
          {def.options.map(opt => {
            const on = cur.includes(opt);
            return (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6, cursor: 'pointer', background: on ? 'var(--ax-cyan-50)' : 'transparent', fontSize: 13, color: 'var(--fg-1)' }}>
                <input type="checkbox" checked={on} onChange={() => onChange(on ? cur.filter(v => v !== opt) : [...cur, opt])} style={{ accentColor: 'var(--ax-cyan-600)' }} />
                {opt}
              </label>
            );
          })}
        </div>
      </div>
    );
  }
  // range
  const v = value && typeof value === 'object' ? value : {};
  const fmtUnit = def.fmt === 'rev' ? '$m' : (def.unit || '');
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{def.label} <span style={{ color: 'var(--fg-4)', fontWeight: 500 }}>({fmtUnit})</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="number" placeholder="Min" value={v.min ?? ''} onChange={e => onChange({ ...v, min: e.target.value === '' ? undefined : +e.target.value })}
          style={{ width: '50%', padding: '6px 8px', border: '1px solid var(--border-1)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-sans)' }} />
        <span style={{ color: 'var(--fg-4)' }}>–</span>
        <input type="number" placeholder="Max" value={v.max ?? ''} onChange={e => onChange({ ...v, max: e.target.value === '' ? undefined : +e.target.value })}
          style={{ width: '50%', padding: '6px 8px', border: '1px solid var(--border-1)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-sans)' }} />
      </div>
    </div>
  );
}

/* ---- distribution bar ---- */
function DistBar({ row, height = 26, showPeers = true, peers }) {
  const { metric, target, mean, median, min, max, q1, q3, pct } = row;
  if (min == null || max == null) return <div style={{ height }} />;
  const d0 = Math.min(min, target), d1 = Math.max(max, target);
  const pad = (d1 - d0) * 0.08 || 1;
  const lo = d0 - pad, hi = d1 + pad, span = (hi - lo) || 1;
  const pos = v => `${((v - lo) / span) * 100}%`;
  const heat = window.bmHeat(pct == null ? null : pct / 100);
  const dotColor = pct == null ? 'var(--fg-3)' : pct >= 60 ? 'var(--ax-positive)' : pct <= 40 ? 'var(--ax-negative)' : 'var(--ax-gray-600)';
  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      {/* baseline track */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, transform: 'translateY(-50%)', background: 'var(--ax-gray-100)', borderRadius: 2 }} />
      {/* IQR band */}
      {q1 != null && q3 != null && (
        <div style={{ position: 'absolute', top: '50%', left: pos(q1), width: `calc(${pos(q3)} - ${pos(q1)})`, height: 10, transform: 'translateY(-50%)', background: 'var(--ax-gray-200)', borderRadius: 3 }} />
      )}
      {/* peer dots */}
      {showPeers && peers && peers.map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: '50%', left: pos(p), width: 5, height: 5, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'var(--ax-gray-400)', opacity: 0.6 }} />
      ))}
      {/* median tick */}
      {median != null && (
        <div style={{ position: 'absolute', top: '50%', left: pos(median), width: 2, height: 16, transform: 'translate(-50%,-50%)', background: 'var(--ax-gray-600)' }} title={`Median ${window.fmtMetric(median, metric.unit)}`} />
      )}
      {/* target dot */}
      <div style={{ position: 'absolute', top: '50%', left: pos(target), width: 13, height: 13, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: dotColor, border: '2.5px solid white', boxShadow: '0 0 0 1px ' + dotColor }} title={`Gain ${window.fmtMetric(target, metric.unit)}`} />
    </div>
  );
}

/* ---- percentile bar: pure 0–100 ranking scale, target pinned ---- */
function PercentileBar({ pct, height = 14, showNumber = true, showScale = true }) {
  const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const p = pct == null ? null : Math.max(0, Math.min(100, pct));
  const r = height / 2;
  const knobD = height + 8;
  // keep the floating number / knob from spilling past the ends
  const clampPos = (v) => `clamp(${knobD / 2}px, ${v}%, calc(100% - ${knobD / 2}px))`;
  return (
    <div style={{ width: '100%' }}>
      {showNumber && (
        <div style={{ position: 'relative', height: 20, marginBottom: 5 }}>
          {p != null && (
            <span style={{ position: 'absolute', left: clampPos(p), transform: 'translateX(-50%)', fontSize: 15, fontWeight: 800, lineHeight: 1, color: 'var(--ax-positive)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{ord(p)}</span>
          )}
        </div>
      )}
      <div style={{ position: 'relative', height }}>
        {/* gradient ranking track */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: 'linear-gradient(90deg, #EAF6F0 0%, #BEE4D2 28%, #79C9A5 56%, #2C9970 82%, #0E7A50 100%)' }} />
        {/* quartile dividers */}
        {[25, 50, 75].map(x => (
          <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x + '%', width: 3, transform: 'translateX(-50%)', background: 'white' }} />
        ))}
        {/* pinned target knob */}
        {p != null && (
          <div style={{ position: 'absolute', top: '50%', left: clampPos(p), width: knobD, height: knobD, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'white', border: '3px solid var(--ax-positive)', boxShadow: 'var(--shadow-sm)' }} />
        )}
      </div>
      {showScale && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10.5, color: 'var(--fg-4)', fontVariantNumeric: 'tabular-nums' }}>
          <span>0th</span>
          <span>50th (peer median)</span>
          <span>100th</span>
        </div>
      )}
    </div>
  );
}

/* ---- per-metric breakdown: every company + value, sorted, median pinned ---- */
function MetricBreakdown({ row, target, peers, last }) {
  const m = row.metric;
  const list = [{ name: target.name, color: target.color, v: target[m.id], isTarget: true }]
    .concat(peers.map(p => ({ name: p.name, color: p.color, v: p[m.id], isTarget: false })))
    .filter(c => c.v != null);
  list.sort((a, b) => m.dir === 'high' ? b.v - a.v : a.v - b.v);
  if (!list.length) return (
    <div style={{ background: 'var(--ax-gray-25)', borderBottom: last ? 'none' : '1px solid var(--ax-gray-100)', padding: '12px 16px 14px 38px', fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>No values reported for this metric.</div>
  );
  const vals = list.map(c => c.v);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = (hi - lo) || 1;
  const median = row.median;
  const fmt = (v) => window.fmtMetric(v, m.unit);
  let divAt = -1;
  if (median != null) for (let i = 0; i < list.length; i++) {
    if (m.dir === 'high' ? list[i].v < median : list[i].v > median) { divAt = i; break; }
  }
  const renderRow = (c, idx) => {
    const fill = Math.max(2, ((c.v - lo) / span) * 100);
    return (
      <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '26px 172px 1fr 76px', alignItems: 'center', gap: 10, padding: '5px 0' }}>
        <span style={{ fontSize: 11, color: 'var(--fg-4)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{idx + 1}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, background: c.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{c.name[0]}</span>
          <span style={{ fontSize: 12.5, fontWeight: c.isTarget ? 700 : 500, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
          {c.isTarget && <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--ax-cyan-700)', letterSpacing: '0.05em', background: 'var(--ax-cyan-50)', border: '1px solid var(--border-brand)', borderRadius: 3, padding: '0 4px', flexShrink: 0 }}>TARGET</span>}
        </span>
        <span style={{ position: 'relative', height: 8, background: 'var(--ax-gray-100)', borderRadius: 4 }}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fill + '%', borderRadius: 4, background: c.isTarget ? 'var(--ax-positive)' : 'var(--ax-gray-300)' }} />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: c.isTarget ? 700 : 600, color: c.isTarget ? 'var(--ax-positive)' : 'var(--fg-2)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.v)}</span>
      </div>
    );
  };
  const items = [];
  list.forEach((c, idx) => {
    if (idx === divAt) items.push(
      <div key="med" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0 5px 36px' }}>
        <span style={{ flex: 1, height: 0, borderTop: '1px dashed var(--ax-gray-400)' }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>Peer median · {fmt(median)}</span>
        <span style={{ flex: 1, height: 0, borderTop: '1px dashed var(--ax-gray-400)' }} />
      </div>
    );
    items.push(renderRow(c, idx));
  });
  return (
    <div style={{ background: 'var(--ax-gray-25)', borderBottom: last ? 'none' : '1px solid var(--ax-gray-100)', padding: '12px 16px 14px 38px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginBottom: 9 }}>
        All <strong style={{ color: 'var(--fg-1)' }}>{list.length}</strong> companies ranked by {m.label} — {target.name} sits <strong style={{ color: 'var(--fg-1)' }}>#{row.rank}</strong> of {row.of}{row.deltaMedian != null && <span>, <strong style={{ color: 'var(--fg-1)' }}>{window.fmtSigned(row.deltaMedian, m.unit)}</strong> vs the peer median</span>}.
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>{items}</div>
    </div>
  );
}

/* ---- percentile pill ---- */
function PctPill({ pct, small }) {
  if (pct == null) return <span style={{ color: 'var(--fg-4)' }}>—</span>;
  const good = pct >= 60, bad = pct <= 40;
  const bg = good ? 'var(--ax-positive-bg)' : bad ? 'var(--ax-negative-bg)' : 'var(--ax-neutral-bg)';
  const fg = good ? 'var(--ax-positive)' : bad ? 'var(--ax-negative)' : 'var(--fg-2)';
  const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, padding: small ? '2px 7px' : '3px 9px', background: bg, color: fg, borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: small ? 11 : 12, fontVariantNumeric: 'tabular-nums' }}>
      {ord(pct)}<span style={{ fontSize: small ? 9 : 10, fontWeight: 600, opacity: 0.7 }}>pctl</span>
    </span>
  );
}

/* ---- format a company's value for a filter-derived column ---- */
function peerCellValue(c, col) {
  const v = c[col.id];
  if (v == null) return '—';
  if (col.fmt === 'rev') return window.fmtRevenue(v);
  if (col.unit === '%') return v + '%';
  if (col.unit === 'x') return (+v).toFixed(1) + 'x';
  return String(v);
}

/* ---- peer chip ---- */
function PeerChip({ p, added, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 4px 4px 8px',
      background: added ? 'var(--ax-cyan-50)' : 'var(--ax-gray-50)',
      border: '1px solid ' + (added ? 'var(--border-brand)' : 'var(--border-1)'),
      borderRadius: 'var(--r-md)', fontSize: 13,
    }}>
      <span style={{ width: 18, height: 18, borderRadius: 4, background: p.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{p.name[0]}</span>
      <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{p.name}</span>
      <button onClick={onRemove} title="Remove from peer set" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-4)', padding: 2, lineHeight: 0, borderRadius: 4 }}>
        <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
    </span>
  );
}

function BenchmarkCompany({ tweaks }) {
  const [filters, setFilters] = cUseState(() => window.BM_DEFAULT_FILTERS.map(f => ({ ...f })));
  const [target] = cUseState(window.BM_TARGET);
  const [editId, setEditId] = cUseState(null);
  const [openMetric, setOpenMetric] = cUseState(null);
  const [addOpen, setAddOpen] = cUseState(false);
  const editRefs = cUseRef({});
  const addRef = cUseRef(null);
  const [targetMenu, setTargetMenu] = cUseState(false);
  const targetRef = cUseRef(null);
  // manual roster edits, applied on top of the filter result
  const [manualAdd, setManualAdd] = cUseState([]);     // company names force-included
  const [manualRemove, setManualRemove] = cUseState([]); // company names force-excluded
  const [addCoOpen, setAddCoOpen] = cUseState(false);
  const [addCoQuery, setAddCoQuery] = cUseState('');
  const addCoRef = cUseRef(null);
  // "Add company" control living up in the filter bar
  const [addCoTopOpen, setAddCoTopOpen] = cUseState(false);
  const [addCoTopQuery, setAddCoTopQuery] = cUseState('');
  const addCoTopRef = cUseRef(null);
  const addCoTopInputRef = cUseRef(null);

  const filterPeers = cUseMemo(() => window.bmApplyFilters(filters), [filters]);
  const peers = cUseMemo(() => {
    const map = new Map();
    filterPeers.forEach(c => map.set(c.name, c));
    manualAdd.forEach(n => { const c = window.BM_UNIVERSE_BY_NAME[n]; if (c) map.set(n, c); });
    manualRemove.forEach(n => map.delete(n));
    map.delete(target.name);
    return [...map.values()];
  }, [filterPeers, manualAdd, manualRemove, target]);
  const report = cUseMemo(() => window.bmBuildReport(target, peers), [target, peers]);

  // remove a peer from the active set, regardless of how it got there
  const removePeer = (name) => {
    setManualAdd(a => a.filter(n => n !== name));
    if (filterPeers.some(c => c.name === name)) setManualRemove(r => r.includes(name) ? r : [...r, name]);
  };
  // add any company to the active set, regardless of filters
  const addPeer = (name) => {
    setManualRemove(r => r.filter(n => n !== name));
    if (!filterPeers.some(c => c.name === name)) setManualAdd(a => a.includes(name) ? a : [...a, name]);
  };
  const manualCount = manualAdd.length + manualRemove.filter(n => filterPeers.some(c => c.name === n)).length;
  // companies you can still add (not the target, not already a peer), filtered by the search box
  const peerNames = cUseMemo(() => new Set(peers.map(p => p.name)), [peers]);
  const addableCompanies = cUseMemo(() => {
    const q = addCoQuery.trim().toLowerCase();
    return window.BM_UNIVERSE.filter(c => c.name !== target.name && !peerNames.has(c.name) && (!q || c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)));
  }, [peerNames, addCoQuery, target]);
  const addableTop = cUseMemo(() => {
    const q = addCoTopQuery.trim().toLowerCase();
    return window.BM_UNIVERSE.filter(c => c.name !== target.name && !peerNames.has(c.name) && (!q || c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)));
  }, [peerNames, addCoTopQuery, target]);
  // companies dropped from the filter result by hand (so they can be restored)
  const restoreRemoved = cUseMemo(() => manualRemove.filter(n => filterPeers.some(c => c.name === n)), [manualRemove, filterPeers]);
  // split the active peer set: in by filter vs added by hand
  const filterChips = cUseMemo(() => peers.filter(p => !manualAdd.includes(p.name)), [peers, manualAdd]);
  const addedChips = cUseMemo(() => peers.filter(p => manualAdd.includes(p.name)), [peers, manualAdd]);
  // columns for the company list = the filters currently applied (fallback to sector + revenue)
  const peerColumns = cUseMemo(() => {
    const cols = filters.map(f => ({ id: f.id, label: f.label, fmt: f.fmt, unit: f.unit }));
    return cols.length ? cols : [{ id: 'sector', label: 'Sector' }, { id: 'revenue', label: 'Revenue', fmt: 'rev' }];
  }, [filters]);
  const peersSorted = cUseMemo(() => peers.slice().sort((a, b) => a.name.localeCompare(b.name)), [peers]);

  const updateFilter = (id, value) => setFilters(fs => fs.map(f => f.id === id ? { ...f, value } : f));
  const removeFilter = (id) => setFilters(fs => fs.filter(f => f.id !== id));
  const addFilter = (def) => {
    setFilters(fs => [...fs, { id: def.id, label: def.label, fmt: def.fmt, unit: def.unit, value: def.editor === 'enum' ? [] : {} }]);
    setAddOpen(false);
    setTimeout(() => setEditId(def.id), 0);
  };
  const resetPeers = () => { setFilters(window.BM_DEFAULT_FILTERS.map(f => ({ ...f }))); setManualAdd([]); setManualRemove([]); };

  const available = window.BM_FILTER_CATALOGUE.filter(d => !filters.some(f => f.id === d.id));

  // featured metrics for headline cards
  const featured = ['revenue', 'ebitda', 'rev_growth'];
  const featuredRows = featured.map(id => report.rows.find(r => r.metric.id === id)).filter(Boolean);

  const groups = ['Scale', 'Growth', 'Retention & expansion', 'Profitability', 'Valuation'];
  const compHeat = window.bmHeat(report.composite == null ? null : report.composite / 100);

  return (
    <div>
      {/* ===== Control bar: target + peer filters ===== */}
      <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target</span>
          <button ref={targetRef} onClick={() => setTargetMenu(v => !v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 6px', background: 'var(--ax-cyan-50)',
            border: '1px solid var(--border-brand)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            <span style={{ width: 22, height: 22, borderRadius: 5, background: target.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{target.name[0]}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-1)' }}>{target.name}</span>
            <svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 5l3 3 3-3" stroke="var(--fg-3)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {targetMenu && (
            <BmPop anchorRef={targetRef} onClose={() => setTargetMenu(false)} width={240}>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>Demo — target is fixed to <strong>Gain</strong> in this prototype.</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-4)' }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span style={{ fontSize: 13 }}>Search companies…</span>
              </div>
            </BmPop>
          )}

          <span style={{ width: 1, height: 20, background: 'var(--border-1)', margin: '0 2px' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Peer set</span>

          {filters.map(f => (
            <span key={f.id} ref={el => editRefs.current[f.id] = el} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 4px 4px 10px',
              background: tweaks && tweaks.chipStyle === 'cyan' ? 'var(--ax-cyan-50)' : 'var(--ax-gray-50)',
              border: '1px solid ' + (tweaks && tweaks.chipStyle === 'cyan' ? 'var(--border-brand)' : 'var(--border-1)'),
              borderRadius: 'var(--r-md)', fontSize: 13,
            }}>
              <span onClick={() => setEditId(f.id)} style={{ cursor: 'pointer', color: 'var(--fg-2)' }}>
                <span style={{ color: 'var(--fg-3)' }}>{f.label}:</span> <strong style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{summarize(f)}</strong>
              </span>
              <button onClick={() => removeFilter(f.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-4)', padding: 2, lineHeight: 0, borderRadius: 4 }}>
                <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </span>
          ))}
          {editId && filters.find(f => f.id === editId) && (
            <BmPop anchorRef={{ current: editRefs.current[editId] }} onClose={() => setEditId(null)}>
              <FilterEditorBody
                def={window.BM_FILTER_CATALOGUE.find(d => d.id === editId) || { editor: Array.isArray(filters.find(f => f.id === editId).value) ? 'enum' : 'range', label: filters.find(f => f.id === editId).label, options: [] }}
                value={filters.find(f => f.id === editId).value}
                onChange={(v) => updateFilter(editId, v)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button onClick={() => setEditId(null)} style={{ padding: '5px 12px', background: 'var(--ax-gray-900)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Done</button>
              </div>
            </BmPop>
          )}

          <button ref={addRef} onClick={() => setAddOpen(v => !v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'white',
            border: '1px dashed var(--border-2)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13, color: 'var(--fg-2)', fontWeight: 500, fontFamily: 'var(--font-sans)',
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            Add filter
          </button>
          {addOpen && (
            <BmPop anchorRef={addRef} onClose={() => setAddOpen(false)} width={220}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Add a filter</div>
              {available.length === 0 && <div style={{ fontSize: 12, color: 'var(--fg-4)', padding: '4px 6px' }}>All filters added.</div>}
              {available.map(d => (
                <button key={d.id} onClick={() => addFilter(d)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 8px', border: 'none', background: 'transparent', borderRadius: 6, fontSize: 13, color: 'var(--fg-1)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ax-gray-50)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{d.label}</button>
              ))}
            </BmPop>
          )}

          <button ref={addCoTopRef} onClick={() => { setAddCoTopOpen(v => !v); setTimeout(() => addCoTopInputRef.current && addCoTopInputRef.current.focus(), 0); }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--ax-cyan-50)',
            border: '1px solid var(--border-brand)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13, color: 'var(--ax-cyan-700)', fontWeight: 600, fontFamily: 'var(--font-sans)',
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" /><path d="M11.5 11.5l2.5 2.5M11.5 4.5v4M9.5 6.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            Add company
          </button>
          {addCoTopOpen && (
            <BmPop anchorRef={addCoTopRef} onClose={() => { setAddCoTopOpen(false); setAddCoTopQuery(''); }} width={300}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', lineHeight: 0, color: 'var(--fg-4)' }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </span>
                <input ref={addCoTopInputRef} value={addCoTopQuery} onChange={e => setAddCoTopQuery(e.target.value)} placeholder="Search companies to add…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--fg-1)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280, overflowY: 'auto' }}>
                {addableTop.length === 0 && <div style={{ fontSize: 12, color: 'var(--fg-4)', padding: '6px' }}>No companies match.</div>}
                {addableTop.map(c => (
                  <button key={c.name} onClick={() => { addPeer(c.name); setAddCoTopQuery(''); setTimeout(() => addCoTopInputRef.current && addCoTopInputRef.current.focus(), 0); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '6px 7px', border: 'none', background: 'transparent', borderRadius: 6, fontSize: 13, color: 'var(--fg-1)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ax-gray-50)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: c.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{c.name[0]}</span>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--fg-4)' }}>{c.sector}</span>
                    <svg width="11" height="11" viewBox="0 0 12 12" style={{ flexShrink: 0, color: 'var(--ax-cyan-700)' }}><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                ))}
              </div>
            </BmPop>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={resetPeers} style={{ border: 'none', background: 'transparent', color: 'var(--fg-link)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Reset to default</button>
            <span style={{ fontSize: 12.5, color: 'var(--fg-3)' }}><strong style={{ color: 'var(--fg-1)', fontWeight: 700 }}>{peers.length}</strong> peers</span>
          </div>
        </div>
      </div>

      {/* ===== Headline: composite + featured cards ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        {/* composite */}
        <div style={{ background: 'linear-gradient(165deg, var(--ax-cyan-900), var(--ax-cyan-950))', borderRadius: 'var(--r-lg)', padding: '16px 18px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Composite percentile</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{target.name} vs {peers.length} peers</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{report.composite ?? '—'}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>/ 100</span>
          </div>
          <div style={{ marginTop: 10, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: (report.composite ?? 0) + '%', height: '100%', background: 'var(--ax-cyan-400)', borderRadius: 3 }} />
          </div>
        </div>
        {/* featured metrics */}
        {featuredRows.map(r => (
          <div key={r.metric.id} style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)' }}>{r.metric.label}</div>
              <PctPill pct={r.pct} small />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{window.fmtMetric(r.target, r.metric.unit)}</span>
              {r.deltaMedian != null && (
                <span style={{ fontSize: 12.5, fontWeight: 600, color: (r.metric.dir === 'high' ? r.deltaMedian >= 0 : r.deltaMedian <= 0) ? 'var(--ax-positive)' : 'var(--ax-negative)' }}>
                  {window.fmtSigned(r.deltaMedian, r.metric.unit)} <span style={{ color: 'var(--fg-4)', fontWeight: 500 }}>vs median</span>
                </span>
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <PercentileBar pct={r.pct} />
            </div>
          </div>
        ))}
      </div>

      {/* ===== Scorecard table ===== */}
      <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 92px 92px 1fr 96px 92px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--ax-gray-25)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
          <div>Metric</div>
          <div style={{ textAlign: 'right' }}>{target.name}</div>
          <div style={{ textAlign: 'right' }}>Peer median</div>
          <div style={{ paddingLeft: 16 }}>Distribution</div>
          <div style={{ textAlign: 'center' }}>Percentile</div>
          <div style={{ textAlign: 'center' }}>Rank</div>
        </div>
        {groups.map(g => {
          const rows = report.rows.filter(r => r.metric.group === g);
          if (!rows.length) return null;
          return (
            <div key={g}>
              <div style={{ padding: '6px 16px', background: 'var(--ax-gray-50)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-4)', borderBottom: '1px solid var(--border-1)' }}>{g}</div>
              {rows.map((r, i) => {
                const deltaGood = r.metric.dir === 'high' ? r.deltaMedian >= 0 : r.deltaMedian <= 0;
                const open = openMetric === r.metric.id;
                const isLast = i === rows.length - 1;
                return (
                  <React.Fragment key={r.metric.id}>
                  <div onClick={() => setOpenMetric(open ? null : r.metric.id)}
                    onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--ax-gray-25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = open ? 'var(--ax-gray-25)' : 'transparent'; }}
                    style={{ display: 'grid', gridTemplateColumns: '180px 92px 92px 1fr 96px 92px', alignItems: 'center', padding: '11px 16px', borderBottom: (open || !isLast) ? '1px solid var(--ax-gray-100)' : 'none', cursor: 'pointer', background: open ? 'var(--ax-gray-25)' : 'transparent' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-1)', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" style={{ flexShrink: 0, color: open ? 'var(--ax-cyan-700)' : 'var(--fg-4)', transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}><path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span>{r.metric.label}<span style={{ marginLeft: 6, fontSize: 10, color: 'var(--fg-4)', fontWeight: 500 }}>{r.metric.dir === 'high' ? '↑ better' : (r.metric.unit === 'x' ? '↓ cheaper' : '↓ lower better')}</span></span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{window.fmtMetric(r.target, r.metric.unit)}</div>
                    <div style={{ textAlign: 'right', fontSize: 13.5, color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>
                      {window.fmtMetric(r.median, r.metric.unit)}
                      {r.deltaMedian != null && <div style={{ fontSize: 10.5, fontWeight: 600, color: deltaGood ? 'var(--ax-positive)' : 'var(--ax-negative)' }}>{window.fmtSigned(r.deltaMedian, r.metric.unit)}</div>}
                    </div>
                    <div style={{ paddingLeft: 16, paddingRight: 8 }}><PercentileBar pct={r.pct} height={12} showNumber={false} showScale={false} /></div>
                    <div style={{ textAlign: 'center' }}><PctPill pct={r.pct} /></div>
                    <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>
                      <strong style={{ color: 'var(--fg-1)', fontWeight: 700 }}>#{r.rank}</strong> <span style={{ color: 'var(--fg-4)' }}>/ {r.of}</span>
                    </div>
                  </div>
                  {open && <MetricBreakdown row={r} target={target} peers={peers} last={isLast} />}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 10, fontSize: 11.5, color: 'var(--fg-3)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 13, height: 13, borderRadius: '50%', background: 'white', border: '3px solid var(--ax-positive)', boxSizing: 'border-box' }} /> {target.name} (target percentile)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 34, height: 9, borderRadius: 5, background: 'linear-gradient(90deg, #EAF6F0, #0E7A50)' }} /> 0th → 100th ranking scale</span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-4)' }}>Pure ranking read — higher is always better (multiples inverted — lower = cheaper = better).</span>
      </div>

      {/* ===== Companies in this benchmark: columns mirror the applied filters ===== */}
      <div style={{ background: 'white', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'visible', marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-1)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-1)' }}>Companies in this benchmark</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 1 }}>
              <strong style={{ color: 'var(--fg-1)' }}>{peers.length}</strong> companies · columns show the filters applied
              {manualAdd.length > 0 && <span style={{ color: 'var(--ax-cyan-700)' }}> · +{manualAdd.length} added by hand</span>}
            </div>
          </div>
          {/* small add/remove search */}
          <div ref={addCoRef} style={{ position: 'relative', width: 260, marginLeft: 'auto' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', lineHeight: 0, color: 'var(--fg-4)' }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </span>
            <input value={addCoQuery} onChange={e => setAddCoQuery(e.target.value)} onFocus={() => setAddCoOpen(true)}
              placeholder="Add a company…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 28px 7px 30px', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', fontSize: 12.5, fontFamily: 'var(--font-sans)', color: 'var(--fg-1)', background: 'var(--ax-gray-25)' }} />
            {addCoQuery && (
              <button onClick={() => setAddCoQuery('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-4)', padding: 2, lineHeight: 0 }}>
                <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            )}
            {addCoOpen && (
              <BmPop anchorRef={addCoRef} onClose={() => setAddCoOpen(false)} width={300}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280, overflowY: 'auto' }}>
                  {addableCompanies.length === 0 && <div style={{ fontSize: 12, color: 'var(--fg-4)', padding: '6px' }}>No companies match.</div>}
                  {addableCompanies.map(c => (
                    <button key={c.name} onClick={() => { addPeer(c.name); setAddCoQuery(''); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '6px 7px', border: 'none', background: 'transparent', borderRadius: 6, fontSize: 13, color: 'var(--fg-1)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--ax-gray-50)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ width: 18, height: 18, borderRadius: 4, background: c.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{c.name[0]}</span>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--fg-4)' }}>{c.sector}</span>
                      <svg width="11" height="11" viewBox="0 0 12 12" style={{ flexShrink: 0, color: 'var(--ax-cyan-700)' }}><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    </button>
                  ))}
                </div>
              </BmPop>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ background: 'var(--ax-gray-25)' }}>
                <th style={{ textAlign: 'left', padding: '9px 16px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-3)', borderBottom: '1px solid var(--border-1)', minWidth: 180 }}>Company</th>
                {peerColumns.map(col => (
                  <th key={col.id} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-3)', borderBottom: '1px solid var(--border-1)', whiteSpace: 'nowrap' }}>{col.label}</th>
                ))}
                <th style={{ width: 40, borderBottom: '1px solid var(--border-1)' }}></th>
              </tr>
            </thead>
            <tbody>
              {peersSorted.map((p, ri) => {
                const added = manualAdd.includes(p.name);
                const last = ri === peersSorted.length - 1;
                return (
                  <tr key={p.name}>
                    <td style={{ padding: '10px 16px', borderBottom: last ? 'none' : '1px solid var(--ax-gray-100)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 5, background: p.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{p.name[0]}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-1)' }}>{p.name}</span>
                        {added && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ax-cyan-700)', letterSpacing: '0.05em', background: 'var(--ax-cyan-50)', border: '1px solid var(--border-brand)', borderRadius: 3, padding: '1px 5px' }}>ADDED</span>}
                      </div>
                    </td>
                    {peerColumns.map(col => (
                      <td key={col.id} style={{ padding: '10px 14px', borderBottom: last ? 'none' : '1px solid var(--ax-gray-100)', fontSize: 13, color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{peerCellValue(p, col)}</td>
                    ))}
                    <td style={{ padding: '10px 12px', borderBottom: last ? 'none' : '1px solid var(--ax-gray-100)', textAlign: 'right' }}>
                      <button onClick={() => removePeer(p.name)} title="Remove from benchmark" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-4)', padding: 4, lineHeight: 0, borderRadius: 4 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--ax-gray-50)'; e.currentTarget.style.color = 'var(--ax-negative)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-4)'; }}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {peersSorted.length === 0 && (
                <tr><td colSpan={peerColumns.length + 2} style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: 'var(--fg-4)', fontStyle: 'italic' }}>No companies — loosen the filters or add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {restoreRemoved.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border-1)', background: 'var(--ax-gray-25)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>Dropped from filter:</span>
            {restoreRemoved.map(n => (
              <button key={n} onClick={() => addPeer(n)} title="Add back" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'white', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--fg-3)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <span style={{ textDecoration: 'line-through' }}>{n}</span>
                <svg width="11" height="11" viewBox="0 0 12 12" style={{ color: 'var(--ax-cyan-700)' }}><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            ))}
            <button onClick={() => setManualRemove([])} style={{ border: 'none', background: 'transparent', color: 'var(--fg-link)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', marginLeft: 4 }}>Restore all</button>
          </div>
        )}
      </div>
    </div>
  );
}

window.BenchmarkCompany = BenchmarkCompany;
