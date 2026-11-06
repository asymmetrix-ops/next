"use client";

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

export type MasonryItem = {
  id: string;
  /** 1 = one third of the page, 2 = two thirds (needs two adjacent columns). */
  span: 1 | 2;
  /** Wide cards only: allowed to move down the order to leave the fewest blank gaps. */
  flexible?: boolean;
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
export function computeMasonryLayout(
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
