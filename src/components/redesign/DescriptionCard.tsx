"use client";
/**
 * DescriptionCard — Row 1, column 2.
 * When collapsed, stretches to the overview row height; expand → shows full text.
 */
import React, { useCallback, useRef } from "react";
import { useTextTruncation } from "@/hooks/useTextTruncation";
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
  const internalRef = useRef<HTMLDivElement | null>(null);
  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof contentRef === "function") {
        contentRef(node);
      } else if (contentRef) {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
      }
    },
    [contentRef]
  );

  const collapsed = !expanded;
  const isTruncated = useTextTruncation(internalRef, collapsed, [body, fillGridCell]);
  const constrainHeight = fillGridCell && collapsed;

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Description</LinkedH>
      <div
        style={{
          padding: "10px 16px 12px",
          flex: constrainHeight ? 1 : undefined,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: collapsed ? "hidden" : "visible",
        }}
      >
        <div
          ref={setContentRef}
          style={{
            ...descriptionBodyStyle,
            textAlign: "justify" as const,
            flex: constrainHeight ? 1 : undefined,
            minHeight: 0,
            overflow: collapsed ? "hidden" : "visible",
          }}
        >
          {body}
        </div>

        {expanded && isTruncated ? (
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
        ) : null}
      </div>

      {collapsed && isTruncated ? (
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
      ) : null}
    </LinkPanel>
  );
}
