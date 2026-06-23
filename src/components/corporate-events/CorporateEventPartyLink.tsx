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

const NEW_BADGE_CLASSNAME =
  "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-800 shrink-0";

const INLINE_NEW_BADGE_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "9999px",
  padding: "2px 8px",
  fontSize: "10px",
  fontWeight: 600,
  color: "#9a3412",
  backgroundColor: "#ffedd5",
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

  return <span className={NEW_BADGE_CLASSNAME}>New</span>;
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
