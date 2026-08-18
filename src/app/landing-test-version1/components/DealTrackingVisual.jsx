"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1];
const ADVANCE_MS = 4200;

// Illustrative pipeline stages — mirrors the real deal-signal statuses
// (rumoured/reported/anticipated → in-market → exclusivity → closed) without
// naming any actual company or live process.
const COLUMNS = [
  { id: "not-launched", title: "Not yet launched", status: "Signal detected" },
  { id: "deal-prep", title: "Deal prep", status: "Advisor engaged" },
  { id: "strategic-review", title: "Strategic review", status: "Board mandate" },
  { id: "in-market", title: "In market", status: "Teaser out", accent: true },
  { id: "in-exclusivity", title: "In exclusivity", status: "Due diligence" },
  { id: "completed", title: "Completed", status: "Deal closed", success: true },
];

const INITIAL_CARDS = {
  "company-f": { name: "Company F", column: "not-launched" },
  "company-g": { name: "Company G", column: "deal-prep" },
  "company-h": { name: "Company H", column: "strategic-review" },
  "company-a": { name: "Company A", column: "in-market", status: "Teaser out" },
  "company-b": { name: "Company B", column: "in-market", status: "First round bids" },
  "company-c": { name: "Company C", column: "in-exclusivity" },
  "company-d": { name: "Company D", column: "completed" },
};

// Scripted, deterministic pipeline progression — cards advance one stage at
// a time on a loop so the board reads as "live" without relying on
// Math.random() (which would desync server/client render).
const MOVES = [
  { cardId: "company-h", to: "in-market" },
  { cardId: "company-c", to: "completed" },
  { cardId: "company-b", to: "in-exclusivity" },
  { cardId: "company-g", to: "strategic-review" },
  { cardId: "company-f", to: "deal-prep" },
];

function columnStyle(column) {
  if (column.success) {
    return { bg: "#ECFDF3", border: "rgba(5,150,105,0.24)", text: "#047857" };
  }
  if (column.accent) {
    return { bg: "#F0F3FF", border: "rgba(83,111,240,0.35)", text: "#3E5EDC" };
  }
  return { bg: "#FAFBFF", border: "rgba(0,11,41,0.08)", text: "#000B29" };
}

const DealCard = React.forwardRef(function DealCard(
  { card, column, index, entered, reduceMotion },
  ref,
) {
  const style = columnStyle(column);
  return (
    <motion.div
      ref={ref}
      layout
      layoutId={card.id}
      initial={{ opacity: 0, y: 10 }}
      animate={entered ? { opacity: 1, y: 0 } : undefined}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { layout: { duration: 0.6, ease: EASE }, duration: 0.4, delay: 0.5 + index * 0.08, ease: EASE }
      }
      className="rounded-lg border px-3 py-2.5"
      style={{ background: style.bg, borderColor: style.border }}
    >
      <p className="text-sm font-semibold" style={{ color: column.success ? style.text : "#000B29" }}>
        {card.name}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: column.success ? style.text : "#5A6272" }}>
        {card.status || column.status}
      </p>
    </motion.div>
  );
});

export function DealTrackingVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.3, once: true });
  const entered = inView;

  const [cards, setCards] = useState(INITIAL_CARDS);
  const moveIndexRef = useRef(0);

  useEffect(() => {
    if (reduceMotion || !entered) return undefined;

    const timer = window.setInterval(() => {
      const current = moveIndexRef.current;
      const next = current + 1;
      if (next > MOVES.length) {
        setCards(INITIAL_CARDS);
        moveIndexRef.current = 0;
        return;
      }
      const move = MOVES[current];
      setCards((prev) => ({
        ...prev,
        [move.cardId]: {
          ...prev[move.cardId],
          column: move.to,
          status: undefined,
        },
      }));
      moveIndexRef.current = next;
    }, ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [reduceMotion, entered]);

  const columns = useMemo(() => {
    return COLUMNS.map((column) => ({
      column,
      cards: Object.entries(cards)
        .filter(([, card]) => card.column === column.id)
        .map(([id, card]) => ({ id, ...card })),
    }));
  }, [cards]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl p-6 md:p-8"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06), 0 1px 2px rgba(0,11,41,0.04)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-40 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(83,111,240,0.25), transparent 70%)",
        }}
      />

      <div className="relative mb-5 flex items-center gap-2">
        <span className="relative flex size-2 items-center justify-center">
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
            style={{ background: "#536FF0" }}
          />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: "#536FF0" }} />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#5A6272" }}>
          Deal signals · live
        </span>
      </div>

      <div className="landing-kanban-scroll relative -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {columns.map(({ column, cards: columnCards }) => {
          const style = columnStyle(column);
          return (
            <div key={column.id} className="min-w-[128px] flex-1">
              <p
                className="mb-2 truncate text-xs font-semibold"
                style={{ color: column.accent || column.success ? style.text : "#5A6272" }}
              >
                {column.title}
              </p>
              <div className="flex flex-col gap-2">
                <AnimatePresence mode="popLayout">
                  {columnCards.map((card, index) => (
                    <DealCard
                      key={card.id}
                      card={card}
                      column={column}
                      index={index}
                      entered={entered}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
