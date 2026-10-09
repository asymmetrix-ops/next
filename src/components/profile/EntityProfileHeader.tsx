"use client";
/**
 * EntityProfileHeader — shared top section for every entity profile
 * (Company, Investor, Advisor, Individual). Matches Design System > CompanyProfile:
 * logo tile · name + flag · subtitle on the left, action buttons on the right,
 * underline tabs below.
 */
import React, { useEffect, useMemo, useState } from "react";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import { T } from "@/components/redesign/primitives";
import ProfileSubnav, { type ProfileSubnavTab } from "@/components/ProfileSubnav";

export const profileHeaderOutlineButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 600,
  color: T.ink2,
  backgroundColor: "#fff",
  border: `1px solid ${T.divider}`,
  borderRadius: 999,
  height: 36,
  padding: "0 16px",
  boxShadow: "0 1px 2px rgba(16, 28, 70, 0.05)",
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

export const profileHeaderPrimaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  backgroundColor: T.azure,
  border: "none",
  borderRadius: 999,
  height: 36,
  padding: "0 18px",
  boxShadow: "0 6px 18px rgba(42, 70, 234, 0.32)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const TILE_SIZE = 56;

/** Rounded logo tile; falls back through candidate logos, then initials. */
export function EntityLogoTile({
  logos,
  name,
  round = false,
}: {
  logos: Array<string | null | undefined>;
  name: string;
  /** Circular tile (individuals) instead of a rounded square. */
  round?: boolean;
}) {
  const candidates = useMemo(() => {
    const out: string[] = [];
    for (const raw of logos) {
      const resolved = resolveCompanyLogoSrc(raw);
      if (resolved && !out.includes(resolved)) out.push(resolved);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logos.join("|")]);
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => setFailed([]), [candidates]);
  const src = candidates.find((c) => !failed.includes(c)) ?? null;

  const tile: React.CSSProperties = {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: round ? "50%" : 14,
    border: `1px solid ${T.divider}`,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(16, 28, 70, 0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  };

  if (src) {
    return (
      <div style={tile}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${name} logo`}
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
          onError={() => setFailed((f) => [...f, src])}
        />
      </div>
    );
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <div
      style={{
        ...tile,
        background: T.inset,
        color: T.muted,
        fontFamily: T.sans,
        fontSize: 18,
        fontWeight: 700,
      }}
      aria-label={`${name} logo placeholder`}
    >
      {initials || "?"}
    </div>
  );
}

type Props = {
  logo: React.ReactNode;
  title: string;
  /** Rendered inline after the name (e.g. country flag). */
  titleAdornment?: React.ReactNode;
  /** Muted line below the name, e.g. "Formerly …". */
  subtitle?: React.ReactNode;
  /** Right-aligned action buttons. */
  actions?: React.ReactNode;
  tabs?: readonly ProfileSubnavTab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
};

export function EntityProfileHeader({
  logo,
  title,
  titleAdornment,
  subtitle,
  actions,
  tabs,
  activeTab,
  onTabChange,
}: Props) {
  const showTabs = tabs && tabs.length > 0;
  return (
    <div
      className="entity-profile-header"
      style={{
        backgroundColor: "#fff",
        borderBottom: `1px solid ${T.divider}`,
        padding: "0 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: showTabs ? "20px 0 12px" : "20px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: "1 1 280px" }}>
          {logo}
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: T.sans,
                fontSize: "clamp(20px, 3.2vw, 28px)",
                fontWeight: 700,
                color: T.ink,
                letterSpacing: "-0.5px",
                lineHeight: 1.2,
                minWidth: 0,
              }}
            >
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{title}</span>
              {titleAdornment}
            </h1>
            {subtitle ? (
              <div
                style={{
                  marginTop: 3,
                  fontFamily: T.sans,
                  fontSize: 13,
                  color: T.muted,
                  lineHeight: 1.4,
                  overflowWrap: "anywhere",
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {actions}
          </div>
        ) : null}
      </div>

      {showTabs ? (
        <div style={{ marginBottom: 16 }}>
          <ProfileSubnav
            tabs={tabs!}
            activeTab={activeTab ?? ""}
            onChange={(id) => onTabChange?.(id)}
          />
        </div>
      ) : null}
    </div>
  );
}
