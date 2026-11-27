"use client";
/**
 * Peers & Competitors · Acquisition Targets — tabbed table card (Summary tab).
 */
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CompanyLogo from "@/components/investor/CompanyLogo";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import { COUNTRY_FLAG_INLINE_SIZE_PX } from "@/lib/dealRadar";
import {
  formatPeerRevenue,
  sortByRevenueDesc,
  type PeerTargetItem,
} from "@/lib/companyPeersAndTargets";
import {
  CARD_HEADER_BAR_STYLE,
  FIN_METRICS_TAB_STYLE,
  LinkPanel,
  T,
} from "./primitives";

type TabId = "peers" | "targets";

const VISIBLE_ROWS = 6;
const GRID_COLS = "minmax(180px, 2.2fr) minmax(110px, 1.4fr) minmax(90px, 1fr) minmax(90px, 0.9fr)";

const TOOLTIP_TEXT =
  "Lists are generated from public sources and reviewed by the Asymmetrix research team before they appear here.";

type Props = {
  peers: PeerTargetItem[];
  targets: PeerTargetItem[];
  onBenchmark?: () => void;
  /** Opens the Financial Intelligence tab (title + top-right arrow). */
  onOpenSection?: () => void;
};

const headCell: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: T.muted,
};

function OwnershipTag({ value }: { value: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: T.sans,
        fontSize: 11.5,
        fontWeight: 600,
        color: T.azure,
        background: T.azureSoft,
        borderRadius: 999,
        padding: "2px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

function sectorHref(item: PeerTargetItem): string | null {
  const id = item.sector_id;
  if (id == null || !Number.isFinite(Number(id))) return null;
  const isPrimary = String(item.sector_importance ?? "Primary").trim().toLowerCase() === "primary";
  return isPrimary ? `/sector/${id}` : `/sub-sector/${id}`;
}

function Row({ item, isLast }: { item: PeerTargetItem; isLast: boolean }) {
  const hasLink = item.company_id != null && Number.isFinite(Number(item.company_id));
  const sectorLink = sectorHref(item);
  const nameStyle: React.CSSProperties = {
    fontFamily: T.sans,
    fontWeight: 600,
    fontSize: 13,
    color: hasLink ? T.azure : T.ink,
    textDecoration: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: GRID_COLS,
        columnGap: 12,
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: isLast ? "none" : `1px solid ${T.hair}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <CompanyLogo logo={item.logo} name={item.name} size={28} borderRadius={6} />
        {hasLink ? (
          <Link href={`/company/${item.company_id}`} style={nameStyle}>
            {item.name}
          </Link>
        ) : (
          <span style={nameStyle}>{item.name}</span>
        )}
        {item.country_iso2 ? (
          <CountryFlagImg
            iso2={item.country_iso2}
            size={COUNTRY_FLAG_INLINE_SIZE_PX}
          />
        ) : null}
      </div>
      <div
        style={{
          fontFamily: T.sans,
          fontSize: 12.5,
          color: sectorLink ? T.azure : T.body,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.sector?.trim() ? (
          sectorLink ? (
            <Link href={sectorLink} style={{ color: "inherit", textDecoration: "none" }}>
              {item.sector.trim()}
            </Link>
          ) : (
            item.sector.trim()
          )
        ) : (
          ""
        )}
      </div>
      <div>{item.ownership?.trim() ? <OwnershipTag value={item.ownership.trim()} /> : null}</div>
      <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.ink2, whiteSpace: "nowrap" }}>
        {formatPeerRevenue(item)}
      </div>
    </div>
  );
}

export function PeersTargetsCard({ peers, targets, onBenchmark, onOpenSection }: Props) {
  const sortedPeers = useMemo(() => sortByRevenueDesc(peers), [peers]);
  const sortedTargets = useMemo(() => sortByRevenueDesc(targets), [targets]);

  const tabs = useMemo(() => {
    const t: { id: TabId; label: string }[] = [];
    if (sortedPeers.length > 0)
      t.push({ id: "peers", label: "Peers & Competitors" });
    if (sortedTargets.length > 0)
      t.push({ id: "targets", label: "Acquisition Targets" });
    return t;
  }, [sortedPeers.length, sortedTargets.length]);

  const [active, setActive] = useState<TabId>("peers");
  const [showAll, setShowAll] = useState<Record<TabId, boolean>>({ peers: false, targets: false });
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.id === active)) setActive(tabs[0].id);
  }, [tabs, active]);

  if (tabs.length === 0) return null;

  const list = active === "peers" ? sortedPeers : sortedTargets;
  const expanded = showAll[active];
  const rows = expanded ? list : list.slice(0, VISIBLE_ROWS);
  const canBenchmark = active === "peers" && onBenchmark != null;

  return (
    <LinkPanel>
      <div role="tablist" style={CARD_HEADER_BAR_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                ...FIN_METRICS_TAB_STYLE,
                color: active === tab.id ? T.ink : T.muted,
                fontWeight: active === tab.id ? 600 : 500,
                borderBottom: `2px solid ${active === tab.id ? T.azure : "transparent"}`,
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {onOpenSection && (
          <button
            type="button"
            onClick={onOpenSection}
            aria-label="Open Financial Intelligence"
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: T.azure, lineHeight: 1, padding: "2px 4px" }}
          >
            →
          </button>
        )}
        {canBenchmark && (
          <button
            type="button"
            onClick={onBenchmark}
            style={{
              fontFamily: T.sans,
              fontSize: 12.5,
              fontWeight: 600,
              color: T.azure,
              background: T.azureSoft,
              border: `1px solid ${T.cardHoverBorder}`,
              borderRadius: T.r,
              padding: "5px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Benchmark against peers
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 560 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              columnGap: 12,
              padding: "8px 16px",
              borderBottom: `1px solid ${T.hair}`,
              background: T.paper,
            }}
          >
            <div style={headCell}>Company</div>
            <div style={headCell}>Sector</div>
            <div style={headCell}>Ownership</div>
            <div style={headCell}>Revenue</div>
          </div>
          {rows.map((item, i) => (
            <Row
              key={`${item.company_id ?? "x"}-${item.name}-${i}`}
              item={item}
              isLast={i === rows.length - 1}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderTop: `1px solid ${T.hair}`,
        }}
      >
        <span
          style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.sans, fontSize: 12, color: T.muted }}
          onMouseEnter={() => setTipOpen(true)}
          onMouseLeave={() => setTipOpen(false)}
        >
          Curated by Asymmetrix
          <button
            type="button"
            aria-label="How this list is built"
            onClick={() => setTipOpen((v) => !v)}
            onFocus={() => setTipOpen(true)}
            onBlur={() => setTipOpen(false)}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: `1px solid ${T.faint}`,
              background: "transparent",
              color: T.muted,
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
              padding: 0,
              cursor: "help",
            }}
          >
            i
          </button>
          {tipOpen && (
            <span
              role="tooltip"
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: 0,
                width: 260,
                background: "var(--t-ink-fill)",
                color: "#fff",
                fontSize: 12,
                lineHeight: 1.4,
                borderRadius: T.r,
                padding: "8px 10px",
                zIndex: 5,
              }}
            >
              {TOOLTIP_TEXT}
            </span>
          )}
        </span>
        {list.length > VISIBLE_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll((s) => ({ ...s, [active]: !s[active] }))}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: T.sans,
              fontSize: 12.5,
              fontWeight: 600,
              color: T.azure,
              padding: 0,
            }}
          >
            {expanded ? "Show less" : `Show all (${list.length})`}
          </button>
        )}
      </div>
    </LinkPanel>
  );
}
