"use client";
/**
 * DescriptionCard — matches redesign/DescriptionCard.jsx shell (LinkPanel + LinkedH).
 */
import React from "react";
import { LinkPanel, LinkedH, T } from "./primitives";

const EM = "—";

type Props = {
  /** Plain text or em dash when empty */
  text: string;
  expanded: boolean;
  expandable: boolean;
  onToggleExpand: () => void;
  contentRef: React.Ref<HTMLDivElement>;
  fillGridCell?: boolean;
};

export function DescriptionCard({
  text,
  expanded,
  expandable,
  onToggleExpand,
  contentRef,
  fillGridCell = true,
}: Props) {
  const body = text?.trim() || EM;

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Description</LinkedH>
      <div
        style={{
          padding: "14px 22px 16px",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          ref={contentRef}
          style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            color: T.body,
            textAlign: "justify" as const,
            overflow: "hidden",
            display: expanded ? "block" : "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: expanded ? "unset" : 8,
          }}
        >
          {body}
        </div>
        {expandable && (
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
              fontFamily: T.sans,
            }}
          >
            {expanded ? "Show less" : "Expand →"}
          </button>
        )}
      </div>
    </LinkPanel>
  );
}
