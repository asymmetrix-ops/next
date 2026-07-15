"use client";

import React, { useRef } from "react";
import { useTextTruncation } from "@/hooks/useTextTruncation";

type ExpandableTextProps = {
  text: string;
  expanded: boolean;
  onToggle: () => void;
  expandLabel?: string;
  collapseLabel?: string;
  clampLines?: number;
  textStyle?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
};

export function ExpandableText({
  text,
  expanded,
  onToggle,
  expandLabel = "Expand",
  collapseLabel = "Show less",
  clampLines = 3,
  textStyle,
  buttonStyle,
}: ExpandableTextProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isTruncated = useTextTruncation(contentRef, !expanded, [text, clampLines]);

  return (
    <div>
      <div
        ref={contentRef}
        style={{
          overflow: "hidden",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          display: expanded ? "block" : "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: expanded ? undefined : clampLines,
          ...textStyle,
        }}
      >
        {text}
      </div>
      {isTruncated ? (
        <button
          type="button"
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            color: "#0075df",
            cursor: "pointer",
            fontSize: "12px",
            textDecoration: "underline",
            marginLeft: "4px",
            padding: 0,
            ...buttonStyle,
          }}
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      ) : null}
    </div>
  );
}
