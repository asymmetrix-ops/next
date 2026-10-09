import { useLayoutEffect, type RefObject } from "react";

/**
 * Gap-filling masonry on top of CSS grid. The container must use
 * `grid-auto-rows: <rowHeight>px; grid-auto-flow: dense; row-gap: 0` and its
 * children `align-self: start`. Each child gets a `grid-row-end: span N`
 * matching its measured height, so the browser packs cards into the first free
 * slot and the page never keeps holes when a card is missing.
 *
 * Children with an explicit `grid-row` start (e.g. a pinned first row) are
 * measured too. Below `disableBelowPx` the layout is a single column and the
 * spans are cleared.
 */
export function useMasonryGrid(
  ref: RefObject<HTMLElement | null>,
  { rowHeight = 4, gap = 12, disableBelowPx = 768, deps = [] as unknown[] } = {}
) {
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid || typeof ResizeObserver === "undefined") return;

    const apply = (el: HTMLElement) => {
      if (window.innerWidth <= disableBelowPx || el.offsetHeight === 0) {
        el.style.gridRowEnd = "";
        return;
      }
      el.style.gridRowEnd = `span ${Math.ceil((el.offsetHeight + gap) / rowHeight)}`;
    };

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) apply(e.target as HTMLElement);
    });
    const observed = new Set<HTMLElement>();
    const sync = () => {
      const current = new Set(Array.from(grid.children) as HTMLElement[]);
      current.forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          ro.observe(el);
        }
        apply(el);
      });
      observed.forEach((el) => {
        if (!current.has(el)) {
          ro.unobserve(el);
          observed.delete(el);
        }
      });
    };

    sync();
    const mo = new MutationObserver(sync);
    mo.observe(grid, { childList: true });
    const onResize = () => sync();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, rowHeight, gap, disableBelowPx, ...deps]);
}
