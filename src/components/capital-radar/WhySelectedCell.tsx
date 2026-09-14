"use client";

import React from "react";
import { createPortal } from "react-dom";
import { T } from "@/components/redesign/primitives";

type Layout = { x: number; y: number; above: boolean };

function Popover({
  text,
  x,
  y,
}: {
  text: string;
  x: number;
  y: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [layout, setLayout] = React.useState<Layout>({ x, y, above: true });

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pad = 16;
    const gap = 10;
    const halfW = rect.width / 2;
    const clampedX = Math.min(
      window.innerWidth - halfW - pad,
      Math.max(halfW + pad, x)
    );

    const spaceAbove = y - gap;
    const spaceBelow = window.innerHeight - y - gap;
    const above = spaceAbove >= rect.height || spaceAbove >= spaceBelow;

    setLayout({
      x: clampedX,
      y: above ? y - gap : y + gap,
      above,
    });
  }, [x, y, text]);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-[10000] w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white shadow-xl pointer-events-none"
      style={{
        left: layout.x,
        top: layout.y,
        transform: layout.above
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          fontFamily: T.sans,
          fontSize: 12.5,
          lineHeight: 1.55,
          color: T.body,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 11,
            color: T.ink,
            marginBottom: 4,
          }}
        >
          Why selected
        </div>
        {text}
      </div>
    </div>,
    document.body
  );
}

/** Truncated "why selected" text that shows the full rationale in a hover popover. */
export function WhySelectedCell({ text }: { text: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => setMounted(true), []);

  const show = React.useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setHover(true);
  }, []);

  const hide = React.useCallback(() => {
    setHover(false);
    setPos(null);
  }, []);

  if (!text) return <span style={{ color: T.faint }}>—</span>;

  return (
    <span
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{
        display: "block",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: "default",
      }}
    >
      {text}
      {mounted && hover && pos ? (
        <Popover text={text} x={pos.x} y={pos.y} />
      ) : null}
    </span>
  );
}
