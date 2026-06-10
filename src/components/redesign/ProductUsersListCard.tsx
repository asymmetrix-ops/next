"use client";
/**
 * Core Products & Services · Users & Use Cases — tabbed expandable lists.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  LinkPanel,
  T,
  FIN_METRICS_TAB_BAR_STYLE,
  FIN_METRICS_TAB_STYLE,
} from "./primitives";

export type ProductUsersSection = {
  title: string;
  /** CA narrative paragraph(s) shown when expanded */
  body?: string;
  /** Optional bullet points (legacy `product_and_users` segments) */
  items?: string[];
};

type ProductUsersTab = "products" | "useCases";

type Props = {
  /** Legacy flat segment names — converted to expandable rows without body */
  lines?: string[];
  sections?: ProductUsersSection[];
  useCaseSections?: ProductUsersSection[];
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
          gridTemplateColumns: "1fr 18px",
          alignItems: "center",
          gap: 8,
          fontFamily: T.sans,
          opacity: hasDetail ? 1 : 0.92,
        }}
      >
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
            padding: "0 16px 14px 16px",
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

function SectionList({
  sections,
  emptyMessage,
}: {
  sections: ProductUsersSection[];
  emptyMessage: string;
}) {
  const [open, setOpen] = useState<boolean[]>([]);

  useEffect(() => {
    setOpen((prev) =>
      prev.length === sections.length
        ? prev
        : Array.from({ length: sections.length }, () => false)
    );
  }, [sections.length]);

  if (sections.length === 0) {
    return (
      <div
        style={{
          padding: "16px",
          fontSize: 13,
          color: T.muted,
          fontFamily: T.sans,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0 6px" }}>
      {sections.map((entry, i) => (
        <ExpandableRow
          key={`${entry.title}-${i}`}
          title={entry.title}
          body={entry.body}
          items={entry.items}
          index={i}
          isOpen={open[i] ?? false}
          onToggle={(e) => {
            e.stopPropagation();
            setOpen((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
          }}
          isLast={i === sections.length - 1}
        />
      ))}
    </div>
  );
}

function TabHeader({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: ProductUsersTab; label: string }[];
  activeTab: ProductUsersTab;
  onTabChange: (tab: ProductUsersTab) => void;
}) {
  return (
    <div role="tablist" style={FIN_METRICS_TAB_BAR_STYLE}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "nowrap",
          minWidth: 0,
          flex: 1,
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="fin-tab-scroll"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={(e) => {
              e.stopPropagation();
              onTabChange(tab.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              ...FIN_METRICS_TAB_STYLE,
              color: activeTab === tab.id ? T.ink : T.muted,
              fontWeight: activeTab === tab.id ? 600 : 500,
              borderBottom: `2px solid ${activeTab === tab.id ? T.azure : "transparent"}`,
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "color 120ms, border-color 120ms",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProductUsersListCard({
  lines = [],
  sections,
  useCaseSections = [],
  fillGridCell = true,
}: Props) {
  const productSections: ProductUsersSection[] = useMemo(() => {
    if (Array.isArray(sections) && sections.length > 0) return sections;
    return lines.map((line) => ({ title: line }));
  }, [sections, lines]);

  const useCases = useCaseSections ?? [];

  const tabs: { id: ProductUsersTab; label: string }[] = useMemo(
    () => [
      { id: "products", label: "Core Products & Services" },
      { id: "useCases", label: "Users & Use Cases" },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState<ProductUsersTab>("products");

  useEffect(() => {
    if (activeTab === "products" && productSections.length === 0 && useCases.length > 0) {
      setActiveTab("useCases");
    }
  }, [activeTab, productSections.length, useCases.length]);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <TabHeader tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div
        style={{
          paddingBottom: 4,
          flex: fillGridCell ? 1 : undefined,
          minHeight: fillGridCell ? 0 : undefined,
          display: fillGridCell ? "flex" : undefined,
          flexDirection: fillGridCell ? "column" : undefined,
          overflow: fillGridCell ? "auto" : undefined,
        }}
      >
        {activeTab === "products" ? (
          <SectionList
            sections={productSections}
            emptyMessage="No products or services listed."
          />
        ) : (
          <SectionList
            sections={useCases}
            emptyMessage="No users or use cases listed."
          />
        )}
      </div>
    </LinkPanel>
  );
}
