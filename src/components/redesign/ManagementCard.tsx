"use client";
/**
 * ManagementCard — redesign/ManagementCard.jsx converted to TypeScript.
 * Layout: 4-column grid — avatar initials · name (linked) · role · tenure.
 * Shows all people passed in; "current" first, then "past" with a section
 * label when both groups are present. Has optional See-more collapse.
 */
import React, { useState } from "react";
import Link from "next/link";
import { LinkPanel, LinkedH, T } from "./primitives";

export type ManagementPerson = {
  id?: number;
  name: string;
  role: string;
  tenure?: string;
  individualId?: number;
};

type Props = {
  current: ManagementPerson[];
  past?: ManagementPerson[];
  /** Number of rows shown before "See more". Default 6. */
  maxVisible?: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: `oklch(86% 0.04 ${(index * 53) % 360})`,
        color: T.body,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: T.sans,
        fontWeight: 600,
        fontSize: 10.5,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

const COL = "32px 1.4fr 1fr auto";

function ColHeader() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COL,
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: T.paper,
        borderBottom: `1px solid ${T.hair}`,
        fontSize: 10.5,
        fontWeight: 500,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      <div />
      <div>Name</div>
      <div style={{ textAlign: "center" }}>Role</div>
      <div style={{ textAlign: "right" }}>Tenure</div>
    </div>
  );
}

function PersonRow({
  person,
  index,
  last,
}: {
  person: ManagementPerson;
  index: number;
  last: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COL,
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
      }}
    >
      <Avatar name={person.name} index={index} />
      <div style={{ minWidth: 0 }}>
        {person.individualId ? (
          <Link
            href={`/individual/${person.individualId}`}
            prefetch={false}
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: T.azure,
              textDecoration: "underline",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}
          >
            {person.name}
          </Link>
        ) : (
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: T.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}
          >
            {person.name}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          color: T.body,
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {person.role || "—"}
      </div>
      <div
        style={{
          fontFamily: T.mono,
          fontSize: 11,
          color: T.muted,
          whiteSpace: "nowrap",
          textAlign: "right",
        }}
      >
        {person.tenure || "—"}
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "10px 16px 2px",
        fontSize: 10.5,
        fontWeight: 600,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        background: T.paper,
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      {label}
    </div>
  );
}

export function ManagementCard({
  current,
  past = [],
  maxVisible = 6,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasBoth = current.length > 0 && past.length > 0;
  const total = current.length + past.length;

  const headerRight = [
    current.length > 0 && `${current.length} current`,
    past.length > 0 && `${past.length} past`,
  ]
    .filter(Boolean)
    .join(" · ");

  const allPeople: { person: ManagementPerson; section: "current" | "past" }[] = [
    ...current.map((p) => ({ person: p, section: "current" as const })),
    ...past.map((p) => ({ person: p, section: "past" as const })),
  ];

  const visible = expanded ? allPeople : allPeople.slice(0, maxVisible);
  const needsToggle = total > maxVisible;

  // Track where section label should appear
  let lastSection: string | null = null;

  return (
    <LinkPanel>
      <LinkedH right={headerRight || undefined}>Management</LinkedH>
      <ColHeader />
      <div style={{ padding: "4px 0" }}>
        {visible.map(({ person, section }, idx) => {
          const showLabel = hasBoth && section !== lastSection;
          if (showLabel) lastSection = section;
          const isLast =
            idx === visible.length - 1 && (!needsToggle || expanded);
          return (
            <React.Fragment key={`${section}-${person.id ?? idx}`}>
              {showLabel && (
                <SectionLabel
                  label={section === "current" ? "Current" : "Past"}
                />
              )}
              <PersonRow
                person={person}
                index={idx}
                last={isLast && !needsToggle}
              />
            </React.Fragment>
          );
        })}
      </div>
      {needsToggle && (
        <div
          style={{
            textAlign: "center",
            padding: "10px 0 14px",
            borderTop: `1px solid ${T.hair}`,
          }}
        >
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none",
              border: "none",
              color: T.azure,
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: T.sans,
            }}
          >
            {expanded ? "Show less" : `See all ${total}`}
          </button>
        </div>
      )}
    </LinkPanel>
  );
}
