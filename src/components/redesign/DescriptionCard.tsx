"use client";
/**
 * DescriptionCard — Row 1, column 2.
 * When collapsed, stretches to the overview row height; expand → shows full text.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LinkPanel, LinkedH, T, descriptionBodyStyle } from "./primitives";

const EM = "-";

type Props = {
  text: string;
  expanded: boolean;
  onToggleExpand: () => void;
  contentRef: React.Ref<HTMLDivElement>;
  /** Fill the grid cell height when collapsed (matches Overview / Finance cards). */
  fillGridCell?: boolean;
};

export function DescriptionCard({
  text,
  expanded,
  onToggleExpand,
  contentRef,
  fillGridCell = false,
}: Props) {
  const body = text?.trim() || EM;
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [canExpand, setCanExpand] = useState(false);

  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof contentRef === "function") contentRef(node);
      else if (contentRef && "current" in contentRef) {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
      }
    },
    [contentRef]
  );

  useEffect(() => {
    if (expanded) return;

    const el = innerRef.current;
    if (!el || body === EM) {
      setCanExpand(false);
      return;
    }

    const measure = () => {
      setCanExpand(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const parent = el.parentElement;
    if (parent) ro.observe(parent);

    return () => ro.disconnect();
  }, [expanded, body, fillGridCell]);

  return (
    <LinkPanel fillGridCell={fillGridCell || expanded}>
      <LinkedH>Description</LinkedH>
      <div
        style={{
          padding: "10px 16px 12px",
          flex: fillGridCell || expanded ? 1 : undefined,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          ref={setContentRef}
          style={{
            ...descriptionBodyStyle,
            textAlign: "justify" as const,
            flex: fillGridCell || expanded ? 1 : undefined,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {body}
        </div>

        {/* Show less — visible only when expanded */}
        {expanded && canExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            style={{
              marginTop: 10,
              padding: 0,
              border: "none",
              background: "none",
              color: T.azure,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              alignSelf: "flex-start",
              flexShrink: 0,
              fontFamily: T.sans,
            }}
          >
            Show less
          </button>
        )}
      </div>

      {/* Gradient fade + Expand button — visible only when collapsed */}
      {!expanded && canExpand && (
        <div
          aria-hidden={false}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 52,
            background: `linear-gradient(to bottom, transparent, ${T.panel} 72%)`,
            display: "flex",
            alignItems: "flex-end",
            paddingBottom: 12,
            paddingLeft: 16,
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            onClick={onToggleExpand}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              color: T.azure,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: T.sans,
              pointerEvents: "auto",
            }}
          >
            Expand →
          </button>
        </div>
      )}
    </LinkPanel>
  );
}
