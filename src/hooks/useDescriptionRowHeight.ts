import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Measures the natural height of the other cards sharing a grid row with a
 * collapsible Description card (e.g. Overview, Financials) and returns a
 * hard height cap for that row.
 *
 * A plain CSS Grid row with `align-items: stretch` still auto-sizes to the
 * tallest item's max-content height regardless of `overflow: hidden` on the
 * others — so a long description just grows the whole row instead of being
 * clipped. Applying `height`/`maxHeight` (not `minHeight`) to the collapsed
 * Description column, driven by its peers' measured height, is what makes
 * its internal `overflow: hidden` + "Expand →" affordance actually work.
 */
export function useDescriptionRowHeight(
  peerRefs: RefObject<HTMLElement | null>[],
  descriptionRef: RefObject<HTMLElement | null>,
  collapsed: boolean,
  deps: unknown[] = []
): React.CSSProperties {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!collapsed) {
      setHeight(0);
      return;
    }

    const peers = peerRefs
      .map((r) => r.current)
      .filter((el): el is HTMLElement => Boolean(el));
    const descEl = descriptionRef.current;
    if (peers.length === 0 || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const prevDisplay = descEl?.style.display ?? "";
      if (descEl) descEl.style.display = "none";
      const max = Math.max(...peers.map((el) => el.offsetHeight));
      if (descEl) descEl.style.display = prevDisplay;
      if (max > 0) setHeight(max);
    };

    measure();
    const ro = new ResizeObserver(measure);
    peers.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, ...deps]);

  if (height <= 0) return {};
  return { height, maxHeight: height };
}
