"use client";
/**
 * ManagementCard — name · role · tenure · LinkedIn (icon link).
 */
import React, { useState } from "react";
import Link from "next/link";
import { LinkPanel, LinkedH, T, tableColHeaderBarStyle } from "./primitives";
import { LinkedInProfileButton } from "./LinkedInProfileButton";

export type ManagementPerson = {
  id?: number;
  name: string;
  role: string;
  tenure?: string;
  individualId?: number;
  linkedinUrl?: string;
};

type Props = {
  current: ManagementPerson[];
  past?: ManagementPerson[];
  /** Number of rows shown before "See more". Default 4. */
  maxVisible?: number;
  fillGridCell?: boolean;
};

const COL = "1fr 1.2fr 44px";
const COL_GAP = 6;

function ColHeader() {
  return (
    <div
      style={{
        ...tableColHeaderBarStyle,
        gridTemplateColumns: COL,
        gap: COL_GAP,
      }}
    >
      <div>Name</div>
      <div style={{ textAlign: "center" }}>Role</div>
      <div style={{ textAlign: "center" }}>LinkedIn</div>
    </div>
  );
}

function PersonRow({
  person,
  last,
}: {
  person: ManagementPerson;
  last: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COL,
        alignItems: "center",
        gap: COL_GAP,
        padding: "10px 16px",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {person.individualId ? (
          <Link
            href={`/individual/${person.individualId}`}
            prefetch={false}
            style={{
              fontSize: 13,
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
              fontSize: 13,
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
          fontSize: 13,
          color: T.body,
          textAlign: "center",
        }}
      >
        {person.role || "—"}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <LinkedInProfileButton href={person.linkedinUrl} />
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
        fontWeight: 500,
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
  maxVisible = 4,
  fillGridCell = false,
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

  let lastSection: string | null = null;

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH showArrow={false} right={headerRight || undefined}>
        Management
      </LinkedH>
      <ColHeader />
      <div>
        {visible.map(({ person, section }, idx) => {
          const showLabel = hasBoth && section !== lastSection && section !== "current";
          if (showLabel) lastSection = section;
          const isLastVisibleRow = idx === visible.length - 1;
          return (
            <React.Fragment key={`${section}-${person.id ?? person.individualId ?? idx}`}>
              {showLabel && <SectionLabel label="Past" />}
              <PersonRow person={person} last={isLastVisibleRow} />
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
              fontSize: 13,
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
