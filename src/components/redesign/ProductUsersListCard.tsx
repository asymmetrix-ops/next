"use client";
/**
 * Core Products & Services — expandable list from CA `company_products_services`
 * or structured `product_and_users` / legacy segment names.
 */
import React from "react";
import { LinkPanel, LinkedH, T } from "./primitives";

export type ProductUsersSection = {
  title: string;
  /** CA narrative paragraph(s) shown when expanded */
  body?: string;
  /** Optional bullet points (legacy `product_and_users` segments) */
  items?: string[];
};

type Props = {
  /** Legacy flat segment names — converted to expandable rows without body */
  lines?: string[];
  sections?: ProductUsersSection[];
  fillGridCell?: boolean;
};

function ExpandableRow({
  title,
  body,
  items,
  index,
  isOpen,
  onToggle,
  isLast,
}: {
  title: string;
  body?: string;
  items?: string[];
  index: number;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  isLast: boolean;
}) {
  const hasDetail =
    Boolean(body?.trim()) || (Array.isArray(items) && items.some((i) => i.trim()));

  return (
    <div
      style={{
        borderBottom: isLast ? "none" : `1px solid ${T.hair}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasDetail}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "12px 16px",
          cursor: hasDetail ? "pointer" : "default",
          textAlign: "left",
          display: "grid",
          gridTemplateColumns: "22px 1fr 18px",
          alignItems: "center",
          gap: 8,
          fontFamily: T.sans,
          opacity: hasDetail ? 1 : 0.92,
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
          {index + 1}.
        </span>
        <span
          style={{
            fontFamily: T.sans,
            fontWeight: 600,
            fontSize: 13,
            color: T.ink,
            lineHeight: 1.35,
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 14,
            color: hasDetail ? T.muted : T.faint,
            textAlign: "center",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 160ms",
            display: "inline-block",
            lineHeight: 1,
            visibility: hasDetail ? "visible" : "hidden",
          }}
          aria-hidden
        >
          ›
        </span>
      </button>
      {isOpen && hasDetail && (
        <div
          style={{
            padding: "0 16px 14px 46px",
            fontSize: 13,
            lineHeight: 1.55,
            color: T.body,
          }}
        >
          {body?.trim() ? (
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{body.trim()}</p>
          ) : null}
          {items && items.length > 0 ? (
            <ul
              style={{
                margin: body?.trim() ? "10px 0 0" : 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {items.map((para, j) => (
                <li
                  key={`${index}-${j}-${para.slice(0, 24)}`}
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
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ProductUsersListCard({
  lines = [],
  sections,
  fillGridCell = true,
}: Props) {
  const resolvedSections: ProductUsersSection[] = React.useMemo(() => {
    if (Array.isArray(sections) && sections.length > 0) return sections;
    return lines.map((line) => ({ title: line }));
  }, [sections, lines]);

  const [open, setOpen] = React.useState<boolean[]>([]);

  React.useLayoutEffect(() => {
    setOpen((prev) =>
      prev.length === resolvedSections.length
        ? prev
        : Array.from({ length: resolvedSections.length }, () => false)
    );
  }, [resolvedSections.length]);

  const toggleSection = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Core Products &amp; Services</LinkedH>
      <div style={{ paddingBottom: 4, flex: 1, minHeight: 0 }}>
        {resolvedSections.length > 0 ? (
          <div style={{ padding: "4px 0 6px" }}>
            {resolvedSections.map((entry, i) => (
              <ExpandableRow
                key={`${entry.title}-${i}`}
                title={entry.title}
                body={entry.body}
                items={entry.items}
                index={i}
                isOpen={open[i] ?? false}
                onToggle={(e) => toggleSection(i, e)}
                isLast={i === resolvedSections.length - 1}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "16px",
              fontSize: 13,
              color: T.muted,
              fontFamily: T.sans,
            }}
          >
            No products or services listed.
          </div>
        )}
      </div>
    </LinkPanel>
  );
}
