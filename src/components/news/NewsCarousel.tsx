"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  /** Called when the user scrolls near the end, so the next page can load. */
  onNearEnd?: () => void;
  loadingMore?: boolean;
  /** Rows of tiles shown at once (they scroll sideways together). */
  rows?: number;
};

/** A block of tiles, one or more rows tall, that scrolls sideways with previous/next arrows. */
export default function NewsCarousel({ title, children, onNearEnd, loadingMore, rows = 1 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - el.clientWidth * 0.6) onNearEnd?.();
  }, [onNearEnd]);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <section aria-labelledby="nw-feed-h" className="nw-carousel-wrap">
      <div className="nw-section-row">
        <h2 className="nw-section-title" id="nw-feed-h">{title}</h2>
        <div className="nw-carousel-arrows">
          <button type="button" className="nw-arrow" aria-label="Previous news" disabled={!canPrev} onClick={() => scroll(-1)}>
            ‹
          </button>
          <button type="button" className="nw-arrow" aria-label="Next news" disabled={!canNext && !loadingMore} onClick={() => scroll(1)}>
            ›
          </button>
        </div>
      </div>
      <div
        className="nw-carousel"
        ref={ref}
        onScroll={update}
        tabIndex={0}
        aria-label={title}
        style={{ ["--nw-rows" as string]: rows } as React.CSSProperties}
      >
        {children}
        {loadingMore && <div className="nw-carousel-item nw-skel" aria-hidden="true" />}
      </div>
    </section>
  );
}
