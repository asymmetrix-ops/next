"use client";
/**
 * DescriptionCard — Row 1, column 2.
 * Collapses to the Overview card height. Expand → shows full text.
 */
import React from "react";
import { LinkPanel, LinkedH, T } from "./primitives";

const EM = "—";

type Props = {
  text: string;
  expanded: boolean;
  onToggleExpand: () => void;
  contentRef: React.Ref<HTMLDivElement>;
  /** Height (px) the card should occupy when collapsed. 0 = not yet measured. */
  collapsedHeight?: number;
};

export function DescriptionCard({
  text,
  expanded,
  onToggleExpand,
  contentRef,
  collapsedHeight = 0,
}: Props) {
  const body = text?.trim() || EM;
  const isLong = body !== EM && body.length > 120;

  return (
    <LinkPanel fillGridCell={expanded}>
      <LinkedH>Description</LinkedH>
      <div
        style={{
          padding: "10px 16px 12px",
          flex: expanded ? 1 : undefined,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          ref={contentRef}
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: T.body,
            textAlign: "justify" as const,
            flex: expanded ? 1 : undefined,
            overflow: "hidden",
          }}
        >
          {body}
        </div>

        {/* Show less — visible only when expanded */}
        {expanded && isLong && (
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
      {!expanded && isLong && collapsedHeight > 0 && (
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
