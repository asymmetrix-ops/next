"use client";

import { T } from "@/components/redesign/primitives";

export interface ProfileSubnavTab {
  id: string;
  label: string;
  count?: number;
}

interface ProfileSubnavProps {
  tabs: readonly ProfileSubnavTab[];
  activeTab: string;
  onChange: (id: string) => void;
  /** Pins the row to the top of its scroll container (e.g. sector page). */
  sticky?: boolean;
  className?: string;
}

/**
 * Shared "underline tabs" subnav used at the top of profile / detail pages
 * (company, investor, advisor, sector, sub-sector, etc.). Design: Asymmetrix
 * Profile Subnav Options — Option B (Underline tabs, recommended).
 */
export default function ProfileSubnav({
  tabs,
  activeTab,
  onChange,
  sticky = false,
  className,
}: ProfileSubnavProps) {
  return (
    <nav
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        borderBottom: `1px solid ${T.divider}`,
        overflowX: "auto",
        scrollbarWidth: "none",
        ...(sticky
          ? { position: "sticky" as const, top: 0, zIndex: 30, background: T.panel }
          : {}),
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="ax-profile-subnav-tab"
            data-active={active || undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              background: "none",
              fontFamily: T.sans,
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              color: active ? T.ink : T.muted,
              padding: "10px 0 12px",
              marginBottom: -1,
              borderBottom: `2px solid ${active ? T.azure : "transparent"}`,
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "color 120ms, border-color 120ms",
            }}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                style={{
                  fontFamily: T.sans,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: active ? T.azure : T.muted,
                  background: active ? T.azureSoft : T.inset,
                  borderRadius: 999,
                  padding: "2px 7px",
                }}
              >
                {tab.count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
      <style jsx>{`
        .ax-profile-subnav-tab:hover {
          color: ${T.ink};
        }
        .ax-profile-subnav-tab[data-active] {
          color: ${T.ink};
        }
      `}</style>
    </nav>
  );
}
