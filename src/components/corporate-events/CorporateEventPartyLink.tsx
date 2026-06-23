"use client";

import React from "react";
import { readIsNewFlag } from "@/lib/dealRadar";

export type CorporateEventPartyEntity = {
  is_new?: unknown;
  isNew?: unknown;
  entity_type?: string;
  route?: string;
};

export function corporateEventEntityIsNew(entity: unknown): boolean {
  if (!entity || typeof entity !== "object") return false;
  const record = entity as Record<string, unknown>;
  return readIsNewFlag(record.is_new ?? record.isNew);
}

const INLINE_NEW_BADGE_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "4px",
  padding: "1px 6px",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#fff",
  backgroundColor: "#f59e0b",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  marginLeft: "4px",
  verticalAlign: "middle",
  flexShrink: 0,
};

export const CorporateEventNewBadge: React.FC<{
  variant?: "tailwind" | "inline";
}> = ({ variant = "tailwind" }) => {
  if (variant === "inline") {
    return <span style={INLINE_NEW_BADGE_STYLE}>New</span>;
  }

  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white bg-amber-500 shadow-sm ring-1 ring-amber-600/30 shrink-0">
      New
    </span>
  );
};

type CorporateEventPartyLinkProps = {
  name: string;
  href?: string | null;
  isNew?: unknown;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
  variant?: "tailwind" | "inline";
};

export const CorporateEventPartyLink: React.FC<CorporateEventPartyLinkProps> = ({
  name,
  href,
  isNew,
  linkClassName,
  linkStyle,
  variant = "tailwind",
}) => {
  const showNew = readIsNewFlag(isNew);
  const linkEl = href ? (
    <a href={href} className={linkClassName} style={linkStyle}>
      {name}
    </a>
  ) : (
    <span className={linkClassName} style={linkStyle}>
      {name}
    </span>
  );

  if (!showNew) {
    return linkEl;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {linkEl}
      <CorporateEventNewBadge variant={variant} />
    </span>
  );
};
