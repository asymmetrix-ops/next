"use client";
import React, { useCallback, useRef } from "react";
import { useTextTruncation } from "@/hooks/useTextTruncation";
import { T, descriptionBodyStyle } from "./primitives";

type Props = {
  text: string;
  expanded: boolean;
  onToggleExpand: () => void;
  contentRef?: React.Ref<HTMLDivElement>;
};

const toggleButtonStyle: React.CSSProperties = {
  padding: 0,
  border: "none",
  background: "none",
  color: T.azure,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: T.sans,
};

// Description column inside the Overview card; collapsed it fits the height of the fields beside it
export function OverviewDescription({ text, expanded, onToggleExpand, contentRef }: Props) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof contentRef === "function") {
        contentRef(node);
      } else if (contentRef) {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [contentRef]
  );

  const collapsed = !expanded;
  const isTruncated = useTextTruncation(internalRef, collapsed, [text]);

  const body = (
    <>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: T.muted,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        Description
      </div>
      <div
        ref={setContentRef}
        style={{
          ...descriptionBodyStyle,
          textAlign: "justify" as const,
          flex: collapsed ? 1 : undefined,
          minHeight: 0,
          overflow: collapsed ? "hidden" : "visible",
        }}
      >
        {text}
      </div>
    </>
  );

  if (!collapsed) {
    return (
      <div style={{ padding: "12px 16px 14px", display: "flex", flexDirection: "column" }}>
        {body}
        {isTruncated ? (
          <button
            type="button"
            onClick={onToggleExpand}
            style={{ ...toggleButtonStyle, marginTop: 10, alignSelf: "flex-start" }}
          >
            Show less
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 220 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "12px 16px 14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {body}
      </div>
      {isTruncated ? (
        <div
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
            style={{ ...toggleButtonStyle, pointerEvents: "auto" }}
          >
            Expand
          </button>
        </div>
      ) : null}
    </div>
  );
}
