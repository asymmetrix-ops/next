"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface AnchoredPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  children: React.ReactNode;
  offset?: number;
  align?: "start" | "end";
  /** Bumps when popover content changes size (e.g. picker → editor). */
  layoutKey?: string | number;
  /** Clicks inside this node won't dismiss the popover. */
  boundaryRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  style?: React.CSSProperties;
  /** Fixed width hint for viewport clamping before content measures. */
  width?: number;
  /** Render without panel chrome — children supply their own shell. */
  bare?: boolean;
  /**
   * Keep the popover at its initial screen position while open.
   * Prevents jumps when the anchor moves (e.g. filter chips reflowing the bar).
   */
  lockPosition?: boolean;
  /** Called once the popover is positioned (e.g. to autofocus a search field). */
  onPositioned?: () => void;
}

/** Prevent scroll chaining from inner filter lists to the page. */
export const FILTER_POPOVER_SCROLL_STYLE: React.CSSProperties = {
  overscrollBehavior: "contain",
};

function clampLeft(left: number, panelWidth: number): number {
  const vw = window.innerWidth;
  if (panelWidth <= 0) return left;
  if (left + panelWidth > vw - 8) left = vw - panelWidth - 8;
  if (left < 8) left = 8;
  return left;
}

export function AnchoredPopover({
  anchorRef,
  onDismiss,
  children,
  offset = 8,
  align = "start",
  layoutKey = 0,
  boundaryRef,
  className,
  style,
  width,
  bare = false,
  lockPosition = true,
  onPositioned,
}: AnchoredPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const lockedPosRef = useRef<{ top: number; left: number } | null>(null);
  const positionedRef = useRef(false);

  const measurePosition = useCallback(() => {
    if (!anchorRef.current) return null;
    const a = anchorRef.current.getBoundingClientRect();
    const measuredWidth = ref.current?.getBoundingClientRect().width || width || 0;
    let left = align === "end" ? a.right - measuredWidth : a.left;
    left = clampLeft(left, measuredWidth);
    return { top: a.bottom + offset, left };
  }, [anchorRef, align, offset, width]);

  const applyPosition = useCallback(
    (next: { top: number; left: number }) => {
      if (lockPosition) lockedPosRef.current = next;
      setPos((prev) =>
        prev && prev.top === next.top && prev.left === next.left ? prev : next
      );
    },
    [lockPosition]
  );

  const placeFromAnchor = useCallback(() => {
    if (lockPosition && lockedPosRef.current) return;
    const next = measurePosition();
    if (!next) return;
    applyPosition(next);
  }, [applyPosition, lockPosition, measurePosition]);

  const reclampToViewport = useCallback(() => {
    const current = lockedPosRef.current ?? pos;
    if (!current || !ref.current) return;
    const panelWidth = ref.current.getBoundingClientRect().width || width || 0;
    const left = clampLeft(current.left, panelWidth);
    if (left === current.left) return;
    const next = { top: current.top, left };
    if (lockPosition) lockedPosRef.current = next;
    setPos(next);
  }, [lockPosition, pos, width]);

  const measurePositionRef = useRef(measurePosition);
  measurePositionRef.current = measurePosition;
  const applyPositionRef = useRef(applyPosition);
  applyPositionRef.current = applyPosition;

  // Lock position from the anchor on open; never follow anchor movement while open.
  useLayoutEffect(() => {
    positionedRef.current = false;
    lockedPosRef.current = null;
    const next = measurePositionRef.current();
    if (next) applyPositionRef.current(next);
  }, []);

  // Content size changes (picker → editor) must not re-anchor to a moved button.
  useLayoutEffect(() => {
    if (!lockPosition) {
      placeFromAnchor();
      return;
    }
    reclampToViewport();
  }, [layoutKey, lockPosition, placeFromAnchor, reclampToViewport]);

  useLayoutEffect(() => {
    function onResize() {
      if (lockPosition) reclampToViewport();
      else placeFromAnchor();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [lockPosition, placeFromAnchor, reclampToViewport]);

  useLayoutEffect(() => {
    if (!pos || positionedRef.current) return;
    positionedRef.current = true;
    onPositioned?.();
  }, [pos, onPositioned]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      if (boundaryRef?.current?.contains(e.target as Node)) return;
      onDismiss();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onDismiss, anchorRef, boundaryRef]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: bare ? undefined : width,
        visibility: pos ? "visible" : "hidden",
        zIndex: 9999,
        background: bare ? "transparent" : style?.background,
        border: bare ? "none" : style?.border,
        borderRadius: bare ? 0 : style?.borderRadius,
        boxShadow: bare ? "none" : style?.boxShadow,
        padding: bare ? 0 : style?.padding,
        fontFamily: bare ? undefined : "var(--font-sans)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
