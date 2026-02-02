"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/utils/cn";

type NewFeatureCalloutProps = {
  /** Unique id for this feature, used for dismissal storage. */
  featureKey: string;
  /** Feature go-live date/time. Accepts Date or ISO string. */
  launchedAt: Date | string;
  /** How long to show (default: 14 days). */
  durationDays?: number;
  /** Tooltip title (default: "New Feature"). */
  titleText?: string;
  /** Optional wrapper classes. */
  className?: string;
  children: React.ReactNode;
};

const STORAGE_PREFIX = "asymmetrix:new-feature-dismissed:";
const DAY_MS = 24 * 60 * 60 * 1000;

function toMs(input: Date | string): number | null {
  const ms =
    typeof input === "string" ? Date.parse(input) : (input as Date).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures (private mode, disabled storage, etc)
  }
}

export function NewFeatureCallout({
  featureKey,
  launchedAt,
  durationDays = 14,
  titleText = "New Feature",
  className,
  children,
}: NewFeatureCalloutProps) {
  const launchedAtMs = React.useMemo(() => toMs(launchedAt), [launchedAt]);
  const storageKey = React.useMemo(
    () => `${STORAGE_PREFIX}${featureKey}`,
    [featureKey]
  );

  const [ready, setReady] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLSpanElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);
  const [placement, setPlacement] = React.useState<"top" | "bottom">("top");

  const withinWindow = React.useMemo(() => {
    if (launchedAtMs === null) return false;
    const endsAt = launchedAtMs + Math.max(0, durationDays) * DAY_MS;
    return Date.now() >= launchedAtMs && Date.now() <= endsAt;
  }, [durationDays, launchedAtMs]);

  React.useEffect(() => {
    const stored = safeGet(storageKey);
    const isDismissed = Boolean(stored);
    setDismissed(isDismissed);
    setOpen(!isDismissed);
    setReady(true);
  }, [storageKey]);

  React.useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchorRect(rect);
      // If there's not enough space above, flip to bottom.
      setPlacement(rect.top < 120 ? "bottom" : "top");
    };
    update();
    // Keep it anchored during scroll/resize/layout shifts.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      const popover = popoverRef.current;
      if (!root) return;
      if (e.target instanceof Node) {
        if (root.contains(e.target)) return;
        if (popover && popover.contains(e.target)) return;
      }
      // Treat clicking away as acknowledgement to prevent repeated popovers.
      safeSet(storageKey, String(Date.now()));
      setDismissed(true);
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      safeSet(storageKey, String(Date.now()));
      setDismissed(true);
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, storageKey]);

  const visible = ready && withinWindow && !dismissed;
  if (!visible) return <>{children}</>;

  const dismiss = () => {
    safeSet(storageKey, String(Date.now()));
    setDismissed(true);
    setOpen(false);
  };

  return (
    <span
      ref={rootRef}
      className={cn("relative inline-flex", className)}
    >
      {children}

      {open &&
        anchorRect &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={titleText}
            className={cn(
              "fixed z-[9999] w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
            )}
            style={{
              left: anchorRect.right,
              top: placement === "top" ? anchorRect.top : anchorRect.bottom,
              transform:
                placement === "top"
                  ? "translate(calc(-100% + 0px), calc(-100% - 12px))"
                  : "translate(calc(-100% + 0px), 12px)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900">
                {titleText}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={dismiss}
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-md",
                  "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                )}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Arrow */}
            {placement === "top" ? (
              <>
                <div className="pointer-events-none absolute -bottom-[9px] right-5 h-0 w-0 border-x-[9px] border-x-transparent border-t-[9px] border-t-slate-200" />
                <div className="pointer-events-none absolute -bottom-2 right-5 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white" />
              </>
            ) : (
              <>
                <div className="pointer-events-none absolute -top-[9px] right-5 h-0 w-0 border-x-[9px] border-x-transparent border-b-[9px] border-b-slate-200" />
                <div className="pointer-events-none absolute -top-2 right-5 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-white" />
              </>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}

