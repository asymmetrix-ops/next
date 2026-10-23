"use client";

/**
 * Shared entity chip — tags.txt §10.
 *
 * Companies, investors, advisors, individuals, sectors and subsectors,
 * wherever a set of linked entities is listed (report/article pages,
 * profile cross-links, benchmark criteria). These are links, not
 * classifications: 999px pill, 24px tall, 12px weight 600, borderless
 * (except Subsectors, the one exception), never a dot. Hover darkens the
 * fill only — no border, no lift, no underline; text stays the link colour.
 *
 * Mappings are fixed platform-wide — do not re-map colours per page.
 */

import * as React from "react";
import Link from "next/link";
import { ENTITY_TONES, type EntityKind } from "@/lib/tagColors";

export type { EntityKind };

export interface EntityChipProps {
  kind: EntityKind;
  label: React.ReactNode;
  href?: string | null;
  external?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  children?: React.ReactNode; // e.g. a trailing flag icon
}

const HOVER_CLASS: Record<EntityKind, string> = {
  company: "entity-chip-company",
  investor: "entity-chip-investor",
  advisor: "entity-chip-advisor",
  individual: "entity-chip-individual",
  sector: "entity-chip-sector",
  subsector: "entity-chip-subsector",
};

function baseStyle(kind: EntityKind): React.CSSProperties {
  const tone = ENTITY_TONES[kind];
  const border = "border" in tone && tone.border ? tone.border : "transparent";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 24,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: "nowrap",
    backgroundColor: tone.fill,
    color: tone.text,
    border: `1px solid ${border}`,
    textDecoration: "none",
    cursor: "pointer",
  };
}

/** Entity chip — renders as a Link, external anchor, or plain span (no href). */
export function EntityChip({
  kind,
  label,
  href,
  external = false,
  className,
  style,
  title,
  children,
}: EntityChipProps) {
  const computedStyle: React.CSSProperties = { ...baseStyle(kind), ...style };
  const hoverClass = HOVER_CLASS[kind];
  const classes = [hoverClass, className].filter(Boolean).join(" ");

  const content = (
    <>
      {label}
      {children}
    </>
  );

  if (!href) {
    return (
      <span className={classes} style={computedStyle} title={title}>
        {content}
      </span>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        style={computedStyle}
        title={title}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} className={classes} style={computedStyle} title={title}>
      {content}
    </Link>
  );
}

export default EntityChip;
