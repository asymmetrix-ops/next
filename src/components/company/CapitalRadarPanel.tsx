"use client";

import React from "react";
import Link from "next/link";
import {
  LinkPanel,
  LinkedH,
  Pill,
  T,
  descriptionBodyStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  profileTableCellStyle,
} from "@/components/redesign/primitives";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import { buildLogoSrc } from "@/lib/logoSrc";
import type { PortfolioFollowKey } from "@/lib/portfolioFollow";
import {
  formatCapitalRadarEntityType,
  formatCapitalRadarLocation,
  formatConfidenceFlag,
  formatLastInvestmentDate,
  parseCapitalRadarScore,
  parseSectorList,
  type CapitalRadarEntry,
} from "@/lib/companyCapitalRadar";

type CapitalRadarPanelProps = {
  investors: CapitalRadarEntry[];
  strategicBuyers: CapitalRadarEntry[];
  loading?: boolean;
};

const ROW_GAP = 8;
const ROW_PAD = { header: "8px 14px", body: "10px 14px" } as const;

/** Investors: name | type | match | peers | sector | hq | last inv | confidence | why | portfolio */
const INVESTOR_GRID_COLS =
  "minmax(168px, 1.35fr) minmax(108px, 0.9fr) 56px 56px 64px minmax(120px, 0.95fr) 96px 92px minmax(200px, 1.75fr) 56px";

/** Strategic buyers: same without last-investment column */
const BUYER_GRID_COLS =
  "minmax(168px, 1.35fr) minmax(108px, 0.9fr) 56px 56px 64px minmax(120px, 0.95fr) 92px minmax(200px, 1.75fr) 56px";

const INVESTOR_HEADERS = [
  "Investor / Company",
  "Type",
  "Match",
  "Peers",
  "Sector fit",
  "HQ / Country",
  "Last investment",
  "Confidence",
  "Why selected",
  "Portfolio",
] as const;

const BUYER_HEADERS = [
  "Company",
  "Type",
  "Match",
  "Peers",
  "Sector fit",
  "HQ / Country",
  "Confidence",
  "Why selected",
  "Portfolio",
] as const;

function capitalRadarFollowKey(
  entityType: string | null | undefined
): PortfolioFollowKey {
  const key = String(entityType || "").trim().toLowerCase();
  return key === "investor" ? "followed_investors" : "followed_companies";
}

function capitalRadarProfileHref(entry: CapitalRadarEntry): string | null {
  const id = entry.related_id;
  if (!Number.isFinite(id) || id <= 0) return null;
  const entityType = String(entry.entity_type || "").trim().toLowerCase();
  if (entityType === "investor") return `/investors/${id}`;
  return `/company/${id}`;
}

function confidenceTone(
  flag?: string | null
): "azure" | "lavender" | "ghost" | "neutral" {
  const key = String(flag || "").trim().toLowerCase();
  if (key === "high") return "azure";
  if (key === "limited_data" || key === "limited") return "lavender";
  if (key === "low") return "ghost";
  return "neutral";
}

function colAlign(index: number, variant: TableVariant): "left" | "center" {
  const centerCols =
    variant === "investors"
      ? new Set([2, 3, 4, 7, 9])
      : new Set([2, 3, 4, 6, 8]);
  return centerCols.has(index) ? "center" : "left";
}

function EntityCell({ entry }: { entry: CapitalRadarEntry }) {
  const href = capitalRadarProfileHref(entry);
  const logoSrc = buildLogoSrc(entry.logo_url);
  const name = String(entry.name || "").trim() || "-";

  const content = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: `1px solid ${T.hair}`,
          background: T.inset,
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          color: T.muted,
        }}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <span
        style={{
          ...descriptionBodyStyle,
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} prefetch={false} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
}

type TableVariant = "investors" | "strategic_buyers";

function GridCell({
  align,
  children,
  title,
}: {
  align: "left" | "center";
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div
      title={title}
      style={{
        textAlign: align,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
      }}
    >
      {children}
    </div>
  );
}

function CapitalRadarTable({
  title,
  rows,
  variant,
}: {
  title: string;
  rows: CapitalRadarEntry[];
  variant: TableVariant;
}) {
  if (rows.length === 0) return null;

  const showLastInvestment = variant === "investors";
  const headers = showLastInvestment ? INVESTOR_HEADERS : BUYER_HEADERS;
  const gridCols = showLastInvestment ? INVESTOR_GRID_COLS : BUYER_GRID_COLS;
  const minWidth = showLastInvestment ? 1180 : 1040;

  return (
    <LinkPanel fillGridCell={false}>
      <LinkedH>{title}</LinkedH>
      <div
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          maxWidth: "100%",
        }}
      >
        <div style={{ minWidth, width: "100%", ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: gridCols,
              gap: ROW_GAP,
              padding: ROW_PAD.header,
            }}
          >
            {headers.map((label, index) => (
              <div
                key={label}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: colAlign(index, variant),
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {rows.map((entry, index) => {
            const sectors = parseSectorList(entry.sectors);
            const sectorFit =
              entry.sector_overlap_count != null
                ? String(entry.sector_overlap_count)
                : "-";
            const sectorTitle =
              sectors.length > 0 ? sectors.join(", ") : undefined;
            const score = parseCapitalRadarScore(entry.final_score);
            const followKey = capitalRadarFollowKey(entry.entity_type);
            const last = index === rows.length - 1;

            return (
              <div
                key={`${entry.entity_type}-${entry.id}-${entry.related_id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: gridCols,
                  gap: ROW_GAP,
                  alignItems: "center",
                  padding: ROW_PAD.body,
                  borderBottom: last ? "none" : `1px solid ${T.hair}`,
                }}
              >
                <GridCell align="left">
                  <EntityCell entry={entry} />
                </GridCell>
                <GridCell align="left">
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatCapitalRadarEntityType(entry.entity_type)}
                  </span>
                </GridCell>
                <GridCell align="center">
                  <span style={{ fontWeight: 600, color: T.ink }}>
                    {score != null ? score : "-"}
                  </span>
                </GridCell>
                <GridCell align="center">{entry.peer_overlap_count ?? 0}</GridCell>
                <GridCell align="center" title={sectorTitle}>
                  {sectorFit}
                </GridCell>
                <GridCell align="left">
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatCapitalRadarLocation(entry.city, entry.country)}
                  </span>
                </GridCell>
                {showLastInvestment ? (
                  <GridCell align="left">
                    {formatLastInvestmentDate(entry.last_investment_date)}
                  </GridCell>
                ) : null}
                <GridCell align="center">
                  {entry.confidence_flag ? (
                    <Pill tone={confidenceTone(entry.confidence_flag)}>
                      {formatConfidenceFlag(entry.confidence_flag)}
                    </Pill>
                  ) : (
                    "-"
                  )}
                </GridCell>
                <GridCell align="left" title={entry.why_selected || undefined}>
                  <span
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      lineHeight: 1.45,
                      color: T.body,
                    }}
                  >
                    {entry.why_selected?.trim() || "-"}
                  </span>
                </GridCell>
                <GridCell align="center">
                  {entry.related_id > 0 ? (
                    <InlineFollowButton
                      followKey={followKey}
                      entityId={entry.related_id}
                      label={entry.name || undefined}
                    />
                  ) : (
                    "-"
                  )}
                </GridCell>
              </div>
            );
          })}
        </div>
      </div>
    </LinkPanel>
  );
}

export function CapitalRadarPanel({
  investors,
  strategicBuyers,
  loading = false,
}: CapitalRadarPanelProps) {
  if (loading) {
    return (
      <LinkPanel fillGridCell={false}>
        <LinkedH>Capital Radar</LinkedH>
        <div style={{ ...descriptionBodyStyle, padding: "12px 16px 16px" }}>
          Loading capital radar…
        </div>
      </LinkPanel>
    );
  }

  const hasInvestors = investors.length > 0;
  const hasBuyers = strategicBuyers.length > 0;
  if (!hasInvestors && !hasBuyers) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
        width: "100%",
      }}
    >
      {hasInvestors ? (
        <CapitalRadarTable
          title="Potential Investors"
          rows={investors}
          variant="investors"
        />
      ) : null}
      {hasBuyers ? (
        <CapitalRadarTable
          title="Strategic Buyers"
          rows={strategicBuyers}
          variant="strategic_buyers"
        />
      ) : null}
    </div>
  );
}
