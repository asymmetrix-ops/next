"use client";
/**
 * Product & Users — flat numbered list and/or accordion sections from API `product_and_users`.
 */
import React from "react";
import { LinkPanel, LinkedH, T } from "./primitives";

export type ProductUsersSection = {
  title: string;
  items: string[];
};

type Props = {
  /** Legacy: single-line segments (e.g. `product_users`) */
  lines?: string[];
  /** Structured segments (e.g. `product_and_users`) — accordion when non-empty */
  sections?: ProductUsersSection[];
  fillGridCell?: boolean;
};

export function ProductUsersListCard({
  lines = [],
  sections,
  fillGridCell = true,
}: Props) {
  const hasSections = Array.isArray(sections) && sections.length > 0;
  const sectionCount = sections?.length ?? 0;
  const [open, setOpen] = React.useState<boolean[]>([]);

  React.useLayoutEffect(() => {
    if (hasSections && sectionCount > 0) {
      setOpen((prev) =>
        prev.length === sectionCount
          ? prev
          : Array.from({ length: sectionCount }, () => false)
      );
    }
  }, [hasSections, sectionCount]);

  const toggleSection = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Product &amp; Users</LinkedH>
      <div style={{ paddingBottom: 4, flex: 1, minHeight: 0 }}>
        {hasSections && sections ? (
          <div style={{ padding: "4px 0 6px" }}>
            {sections.map((g, i) => {
              const isOpen = open[i] ?? false;
              return (
                <div
                  key={`${g.title}-${i}`}
                  style={{
                    borderBottom:
                      i === sections.length - 1 ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => toggleSection(i, e)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      padding: "12px 16px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "grid",
                      gridTemplateColumns: "22px 1fr 18px",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: T.sans,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: T.mono,
                        fontSize: 11,
                        color: T.muted,
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      style={{
                        fontFamily: T.sans,
                        fontWeight: 600,
                        fontSize: 13,
                        color: T.ink,
                      }}
                    >
                      {g.title}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color: T.muted,
                        textAlign: "center",
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 160ms",
                        display: "inline-block",
                        lineHeight: 1,
                      }}
                      aria-hidden
                    >
                      ›
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: "0 16px 14px 46px",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: T.body,
                      }}
                    >
                      <ul
                        style={{
                          margin: 0,
                          padding: 0,
                          listStyle: "none",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {g.items.map((para, j) => (
                          <li
                            key={`${i}-${j}-${para.slice(0, 24)}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "14px 1fr",
                              gap: 6,
                              alignItems: "start",
                            }}
                          >
                            <span
                              style={{
                                color: T.azure,
                                fontWeight: 600,
                                lineHeight: 1.55,
                              }}
                            >
                              •
                            </span>
                            <span>{para}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          lines.map((line, i, arr) => (
            <div
              key={`pu-${i}-${line.slice(0, 24)}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "12px 16px",
                borderBottom:
                  i < arr.length - 1 ? `1px solid ${T.hair}` : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: T.muted,
                    width: 22,
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i + 1}.
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: T.ink,
                    lineHeight: 1.35,
                  }}
                >
                  {line}
                </span>
              </div>
              <span
                style={{
                  color: T.faint,
                  fontSize: "15px",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                ›
              </span>
            </div>
          ))
        )}
      </div>
    </LinkPanel>
  );
}
