"use client";

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

export type MasonryItem = {
  id: string;
  /** 1 = one third of the page, 2 = two thirds (needs two adjacent columns). */
  span: 1 | 2;
  /** Wide cards only: allowed to move down the order to leave the fewest blank gaps. */
  flexible?: boolean;
  /** Preferred column (0-based) for narrow cards; moved elsewhere only to remove a gap. */
  home?: number;
  node: React.ReactNode;
};

type Placed = { left: number; top: number; width: number };

const GAP = 12;
const MIN_THREE_COL_WIDTH = 760;
/** A narrow card may fill the gap under a shorter column if it overshoots by at most this much. */
const FILL_TOLERANCE = 120;

/**
 * Packs cards into 3 columns using their real measured heights: each card goes into the
 * currently shortest column; wide cards take two adjacent columns and, before they are
 * placed, later narrow cards fill the shorter of those columns so no blank hole is left.
 */
function layoutOnce(
  items: MasonryItem[],
  heights: Record<string, number>,
  cols: number,
  containerWidth: number
): { placed: Record<string, Placed>; height: number; waste: number } {
  const colW = (containerWidth - GAP * (cols - 1)) / cols;
  const colTop = new Array(cols).fill(0) as number[];
  const placed: Record<string, Placed> = {};
  const queue = [...items];
  let placedWide = false;
  let waste = 0;

  const put = (item: MasonryItem, firstCol: number, span: number, top: number) => {
    const h = heights[item.id] ?? 0;
    placed[item.id] = {
      left: firstCol * (colW + GAP),
      top,
      width: colW * span + GAP * (span - 1),
    };
    const next = h > 0 ? top + h + GAP : top;
    if (h > 0) for (let c = firstCol; c < firstCol + span; c++) waste += top - colTop[c];
    for (let c = firstCol; c < firstCol + span; c++) colTop[c] = next;
  };

  const shortest = () => {
    let best = 0;
    for (let c = 1; c < cols; c++) if (colTop[c] < colTop[best]) best = c;
    return best;
  };

  while (queue.length > 0) {
    // Once no wide card is left, place the tallest remaining cards first so the columns
    // finish at similar heights (longest-first packing).
    if (placedWide && queue.every((q) => Math.min(q.span, cols) === 1)) {
      queue.sort((a, b) => (heights[b.id] ?? 0) - (heights[a.id] ?? 0));
    }
    const item = queue.shift()!;
    const span = Math.min(item.span, cols);

    if (span === 1) {
      const c = shortest();
      put(item, c, 1, colTop[c]);
      continue;
    }

    // Wide card: choose the adjacent column pair that gives the lowest top edge.
    let bestStart = 0;
    let bestTop = Infinity;
    for (let c = 0; c + span <= cols; c++) {
      const top = Math.max(...colTop.slice(c, c + span));
      if (top < bestTop) {
        bestTop = top;
        bestStart = c;
      }
    }
    // Fill the shorter column(s) of that pair with upcoming narrow cards first.
    for (let guard = 0; guard < 8; guard++) {
      const pair = colTop.slice(bestStart, bestStart + span);
      const top = Math.max(...pair);
      const low = bestStart + pair.indexOf(Math.min(...pair));
      if (top - colTop[low] < 40) break;
      const idx = queue.findIndex((q) => {
        if (Math.min(q.span, cols) !== 1) return false;
        const h = heights[q.id] ?? 0;
        return h > 0 && colTop[low] + h <= top + FILL_TOLERANCE;
      });
      if (idx === -1) break;
      const [filler] = queue.splice(idx, 1);
      put(filler, low, 1, colTop[low]);
    }
    const top = Math.max(...colTop.slice(bestStart, bestStart + span));
    put(item, bestStart, span, top);
    placedWide = true;
  }

  const maxTop = Math.max(...colTop);
  for (const t of colTop) waste += maxTop - t;
  const height = Math.max(0, maxTop - GAP);
  return { placed, height, waste };
}

/**
 * Tries every position of each wide card in the placement order (cards before index 3 keep
 * their priority) and keeps the arrangement with the least blank area.
 */
function computeGreedyLayout(
  items: MasonryItem[],
  heights: Record<string, number>,
  cols: number,
  containerWidth: number
): { placed: Record<string, Placed>; height: number } {
  let order = [...items];
  let best = layoutOnce(order, heights, cols, containerWidth);
  const wideIds = items.filter((i) => i.flexible && Math.min(i.span, cols) > 1).map((i) => i.id);
  for (const id of wideIds) {
    const base = order.filter((i) => i.id !== id);
    const wide = order.find((i) => i.id === id)!;
    for (let pos = Math.min(3, base.length); pos <= base.length; pos++) {
      const candidate = [...base.slice(0, pos), wide, ...base.slice(pos)];
      const res = layoutOnce(candidate, heights, cols, containerWidth);
      if (res.waste < best.waste - 1 || (Math.abs(res.waste - best.waste) <= 1 && res.height < best.height)) {
        best = res;
        order = candidate;
      }
    }
  }
  return { placed: best.placed, height: best.height };
}

export default function ProfileMasonry({ items }: { items: MasonryItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const observer = useRef<ResizeObserver | null>(null);
  const elements = useRef(new Map<string, HTMLDivElement>());

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = useCallback((id: string, el: HTMLDivElement) => {
    const h = Math.round(el.getBoundingClientRect().height * 10) / 10;
    setHeights((prev) => (Math.abs((prev[id] ?? -1) - h) < 0.5 ? prev : { ...prev, [id]: h }));
  }, []);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.masonryId;
        if (id) measure(id, entry.target as HTMLDivElement);
      }
    });
    observer.current = ro;
    elements.current.forEach((el) => ro.observe(el));
    return () => {
      ro.disconnect();
      observer.current = null;
    };
  }, [measure]);

  const register = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      const prev = elements.current.get(id);
      if (prev && prev !== el) observer.current?.unobserve(prev);
      if (el) {
        elements.current.set(id, el);
        observer.current?.observe(el);
        measure(id, el);
      } else {
        elements.current.delete(id);
      }
    },
    [measure]
  );

  const cols = width >= MIN_THREE_COL_WIDTH ? 3 : 1;
  const ready = width > 0 && items.every((i) => heights[i.id] != null);

  const layout = useMemo(
    () => (ready ? computeMasonryLayout(items, heights, cols, width) : null),
    [ready, items, heights, cols, width]
  );

  return (
    <div
      ref={containerRef}
      className="company-masonry"
      style={{
        gridColumn: "1 / -1",
        gridRowStart: 2,
        position: "relative",
        minWidth: 0,
        height: layout ? layout.height : undefined,
        // Until every card is measured (first paint only) keep the block invisible.
        visibility: ready ? "visible" : "hidden",
      }}
    >
      {items.map((item) => {
        const p = layout?.placed[item.id];
        const span = Math.min(item.span, cols);
        return (
          <div
            key={item.id}
            ref={register(item.id)}
            data-masonry-id={item.id}
            style={{
              position: "absolute",
              left: p?.left ?? 0,
              top: p?.top ?? 0,
              width: p
                ? p.width
                : width > 0
                  ? ((width - GAP * (cols - 1)) / cols) * span + GAP * (span - 1)
                  : "100%",
              minWidth: 0,
            }}
          >
            {item.node}
          </div>
        );
      })}
    </div>
  );
}

/** Cost (px of blank area) of moving a narrow card out of its home column. */
const OFF_HOME_PENALTY = 220;
/** Cost per step a flexible wide card is pushed down from its priority position. */
const WIDE_SHIFT_PENALTY = 60;
const MAX_CANDIDATES = 400_000;

function placeFixed(
  seq: MasonryItem[],
  colOf: Map<string, number>,
  pairOf: Map<string, number>,
  heights: Record<string, number>,
  cols: number,
  containerWidth: number
): { placed: Record<string, Placed>; height: number; waste: number } {
  const colW = (containerWidth - GAP * (cols - 1)) / cols;
  const colTop = new Array(cols).fill(0) as number[];
  const placed: Record<string, Placed> = {};
  let waste = 0;
  for (const item of seq) {
    const span = Math.min(item.span, cols);
    const first = span === 1 ? colOf.get(item.id)! : pairOf.get(item.id)!;
    let top = 0;
    for (let c = first; c < first + span; c++) top = Math.max(top, colTop[c]);
    const h = heights[item.id] ?? 0;
    placed[item.id] = { left: first * (colW + GAP), top, width: colW * span + GAP * (span - 1) };
    if (h > 0) {
      for (let c = first; c < first + span; c++) waste += top - colTop[c];
      for (let c = first; c < first + span; c++) colTop[c] = top + h + GAP;
    }
  }
  const maxTop = Math.max(...colTop);
  for (const t of colTop) waste += maxTop - t;
  return { placed, height: Math.max(0, maxTop - GAP), waste };
}

/**
 * Keeps every narrow card in its home column unless moving it removes a gap worth more than
 * the penalty; searches column assignments and wide-card positions for the least blank area.
 */
export function computeMasonryLayout(
  items: MasonryItem[],
  heights: Record<string, number>,
  cols: number,
  containerWidth: number
): { placed: Record<string, Placed>; height: number } {
  const narrow = items.filter((i) => Math.min(i.span, cols) === 1);
  const wide = items.filter((i) => Math.min(i.span, cols) > 1);
  const pairChoices = (i: MasonryItem) => cols - Math.min(i.span, cols) + 1;
  const wideCombos = wide.reduce((n, w) => n * pairChoices(w) * (w.flexible ? narrow.length + 1 : 1), 1);
  if (cols < 3 || narrow.length === 0 || Math.pow(cols, narrow.length) * wideCombos > MAX_CANDIDATES) {
    return computeGreedyLayout(items, heights, cols, containerWidth);
  }

  const baseIndexOf = (w: MasonryItem) => items.slice(0, items.indexOf(w)).filter((i) => Math.min(i.span, cols) === 1).length;
  let best: { score: number; res: ReturnType<typeof placeFixed> } | null = null;

  // Wide-card configurations: [pair start, position among narrow cards] per wide card.
  const wideConfigs: Array<Array<[number, number]>> = [[]];
  for (const w of wide) {
    const next: Array<Array<[number, number]>> = [];
    const positions = w.flexible ? Array.from({ length: narrow.length + 1 }, (_, k) => k) : [baseIndexOf(w)];
    for (const cfg of wideConfigs)
      for (let a = 0; a < pairChoices(w); a++) for (const pos of positions) next.push([...cfg, [a, pos]]);
    wideConfigs.length = 0;
    wideConfigs.push(...next);
  }

  const assign = new Array(narrow.length).fill(0) as number[];
  const evaluate = () => {
    let off = 0;
    const colOf = new Map<string, number>();
    narrow.forEach((n, i) => {
      colOf.set(n.id, assign[i]);
      if (assign[i] !== Math.min(n.home ?? i % cols, cols - 1)) off++;
    });
    for (const cfg of wideConfigs) {
      const seq: MasonryItem[] = [...narrow];
      const pairOf = new Map<string, number>();
      // Insert wides from the back so earlier insert positions stay valid.
      const order = wide.map((w, wi) => ({ w, a: cfg[wi][0], pos: cfg[wi][1], wi })).sort((x, y) => y.pos - x.pos || y.wi - x.wi);
      for (const { w, a, pos } of order) {
        seq.splice(pos, 0, w);
        pairOf.set(w.id, a);
      }
      const res = placeFixed(seq, colOf, pairOf, heights, cols, containerWidth);
      let shift = 0;
      wide.forEach((w, wi) => {
        if (w.flexible) shift += Math.abs(cfg[wi][1] - baseIndexOf(w));
      });
      const score = res.waste + off * OFF_HOME_PENALTY + shift * WIDE_SHIFT_PENALTY + res.height * 0.001;
      if (!best || score < best.score) best = { score, res };
    }
  };
  const rec = (i: number) => {
    if (i === narrow.length) return evaluate();
    for (let c = 0; c < cols; c++) {
      assign[i] = c;
      rec(i + 1);
    }
  };
  rec(0);
  const r = best!.res;
  return { placed: r.placed, height: r.height };
}
