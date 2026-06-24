"use client";

import React from "react";
import Link from "next/link";
import { LinkPanel, T, Pill } from "@/components/redesign/primitives";

export type CorporateEventInsight = {
  id?: number;
  tag?: string;
  date?: string;
  title: string;
  content: string;
};

type Props = {
  title: string;
  insights: CorporateEventInsight[];
  fillGridCell?: boolean;
};

export function CorporateEventInsightsPanel({ title, insights, fillGridCell = false }: Props) {
  if (insights.length === 0) return null;

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>{title}</div>
        <div style={{ fontSize: "11.5px", color: T.muted }}>
          {insights.length} article{insights.length === 1 ? "" : "s"}
        </div>
      </div>

      <div
        style={{
          padding: "8px 14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          ...(fillGridCell ? { flex: 1, minHeight: 0, overflow: "auto" } : {}),
        }}
      >
        {insights.map((insight, index) => (
          <div
            key={insight.id ?? index}
            style={{
              paddingBottom: index < insights.length - 1 ? 10 : 0,
              borderBottom: index < insights.length - 1 ? `1px solid ${T.hair}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
              {insight.tag ? (
                <Pill tone="neutral" style={{ fontSize: 10, padding: "1px 6px" }}>
                  {insight.tag}
                </Pill>
              ) : null}
              {insight.date ? (
                <span style={{ fontSize: 11, color: T.muted }}>{insight.date}</span>
              ) : null}
            </div>
            {insight.id ? (
              <Link
                href={`/article/${insight.id}`}
                prefetch={false}
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.ink,
                  textDecoration: "none",
                  lineHeight: 1.35,
                  marginBottom: 4,
                }}
              >
                {insight.title}
              </Link>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.35, marginBottom: 4 }}>
                {insight.title}
              </div>
            )}
            {insight.content ? (
              <p style={{ margin: 0, fontSize: 12, color: T.body, lineHeight: 1.45 }}>{insight.content}</p>
            ) : null}
            {insight.id ? (
              <Link
                href={`/article/${insight.id}`}
                prefetch={false}
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: T.azure,
                  textDecoration: "underline",
                }}
              >
                Read more
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </LinkPanel>
  );
}
