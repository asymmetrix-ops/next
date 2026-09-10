"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { T } from "@/components/redesign/primitives";

type Props = {
  content: string;
  children: React.ReactNode;
  maxWidth?: number;
};

export function HoverTooltip({ content, children, maxWidth = 260 }: Props) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    left: -9999,
    top: 0,
    opacity: 0,
    pointerEvents: "none",
  });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const tip = tipRef.current;
    if (!anchor || !tip) return;

    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const pad = 10;
    const gap = 6;

    let left = rect.left + rect.width / 2;
    const halfW = tipRect.width / 2;
    left = Math.max(pad + halfW, Math.min(left, window.innerWidth - pad - halfW));

    const placeAbove = rect.top > tipRect.height + gap + 8;
    const top = placeAbove ? rect.top - gap : rect.bottom + gap;

    setStyle({
      position: "fixed",
      left,
      top,
      transform: placeAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      opacity: 1,
      pointerEvents: "none",
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || !content.trim()) return;
    setStyle({
      position: "fixed",
      left: -9999,
      top: 0,
      opacity: 0,
      pointerEvents: "none",
    });
    const frame = requestAnimationFrame(() => {
      updatePosition();
      requestAnimationFrame(updatePosition);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, content, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  const show = open && content.trim().length > 0;

  return (
    <>
      <span
        ref={anchorRef}
        style={{ display: "inline-flex", verticalAlign: "middle" }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={show ? tooltipId : undefined}
      >
        {children}
      </span>
      {show && typeof document !== "undefined"
        ? createPortal(
            <div
              id={tooltipId}
              ref={tipRef}
              role="tooltip"
              style={{
                zIndex: 10000,
                maxWidth,
                padding: "6px 10px",
                borderRadius: 6,
                background: T.ink,
                color: "#fff",
                fontSize: 11,
                lineHeight: 1.45,
                fontFamily: T.sans,
                fontWeight: 500,
                boxShadow: "0 6px 16px rgba(15, 23, 42, 0.18)",
                pointerEvents: "none",
                ...style,
              }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
