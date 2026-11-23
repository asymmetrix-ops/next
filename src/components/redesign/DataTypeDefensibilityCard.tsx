"use client";

import React, { useState } from "react";
import { LinkPanel, T, descriptionBodyStyle } from "./primitives";
import { AIRiskCard, type AIRiskCardProps } from "./AIRiskCard";
import {
  type DataTypeCard,
  DATA_TYPE_BADGE_FALLBACK_COLOR,
  dataTypeBadgeBackground,
} from "@/lib/companyDataType";

type Props = {
  dataType: DataTypeCard;
  aiRisk?: AIRiskCardProps | null;
  fillGridCell?: boolean;
};

function DataTypeInfoIcon({ title }: { title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `1px solid ${T.divider}`,
        color: T.muted,
        fontFamily: T.sans,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        cursor: "help",
      }}
    >
      i
    </span>
  );
}

function DataTypeSection({ dataType }: { dataType: NonNullable<DataTypeCard> }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const badgeColor = dataType.color?.trim() || DATA_TYPE_BADGE_FALLBACK_COLOR;
  const badgeBg = dataTypeBadgeBackground(dataType.color);
  const showSummaryLink = Boolean(dataType.summary);

  return (
    <div style={{ padding: "12px 14px 14px" }}>
      <div
        style={{
          fontFamily: T.sans,
          fontSize: 13.5,
          fontWeight: 600,
          color: T.ink,
          marginBottom: 10,
        }}
      >
        Data type
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            ...descriptionBodyStyle,
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            flex: "1 1 auto",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {dataType.name}
          </span>
          {dataType.description ? (
            <DataTypeInfoIcon title={dataType.description} />
          ) : null}
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            padding: "4px 8px",
            borderRadius: 6,
            background: badgeBg,
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 600,
            color: T.body,
            lineHeight: 1.3,
            maxWidth: "48%",
            textAlign: "right",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              background: badgeColor,
              flexShrink: 0,
            }}
          />
          {dataType.defensibility} defensibility
        </span>
      </div>

      {showSummaryLink ? (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            style={{
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: T.sans,
              fontSize: 12.5,
              fontWeight: 600,
              color: T.azure,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            How we classified this
            <span
              style={{
                display: "inline-block",
                transform: summaryOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
                fontSize: 10,
              }}
              aria-hidden
            >
              ▾
            </span>
          </button>
          {summaryOpen && dataType.summary ? (
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontFamily: T.sans,
                fontSize: 12.5,
                lineHeight: 1.55,
                color: T.body,
              }}
            >
              {dataType.summary}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Data type classification + AI Defensibility Index in one right-rail card. */
export function DataTypeDefensibilityCard({
  dataType,
  aiRisk,
  fillGridCell = false,
}: Props) {
  const hasDataType = dataType != null;
  const hasAi = Boolean(aiRisk?.axes && aiRisk.axes.length > 0);

  if (!hasDataType && !hasAi) return null;

  if (hasDataType && !hasAi) {
    return (
      <LinkPanel fillGridCell={fillGridCell}>
        <DataTypeSection dataType={dataType} />
      </LinkPanel>
    );
  }

  if (!hasDataType && hasAi) {
    return (
      <AIRiskCard
        {...aiRisk!}
        fillGridCell={fillGridCell}
        hideDetail
      />
    );
  }

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <DataTypeSection dataType={dataType!} />
      <AIRiskCard
        {...aiRisk!}
        embedded
        sectionDividerTop
        fillGridCell={fillGridCell}
        hideDetail
      />
    </LinkPanel>
  );
}