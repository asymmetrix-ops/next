"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  LinkPanel,
  LinkedH,
  T,
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import { isEmptyDisplayValue, normalizeEmptyDisplay } from "@/lib/emptyDisplay";

export type InvestorTeamMember = {
  id?: number;
  name: string;
  roleTitle?: string | null;
  individualId?: number;
};

type Props = {
  members: InvestorTeamMember[];
  maxVisible?: number;
  fillGridCell?: boolean;
};

const PEOPLE_ROW_GRID = "32px minmax(0, 1.35fr) minmax(0, 1.2fr)";
const COL_GAP = 8;

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function Avatar({ name, index }: { name: string; index: number }) {
  const hue = (index * 53) % 360;
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: `oklch(86% 0.04 ${hue})`,
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
      {initialsFor(name) || "?"}
    </div>
  );
}

function ColHeader() {
  return (
    <div
      style={{
        ...tableColHeaderBarStyle,
        gridTemplateColumns: PEOPLE_ROW_GRID,
        gap: COL_GAP,
        padding: "8px 16px",
      }}
    >
      <div />
      <div style={tableColHeaderStyle}>Name</div>
      <div style={{ ...tableColHeaderStyle, textAlign: "center" }}>Role title</div>
    </div>
  );
}

function PersonRow({
  person,
  index,
  last,
}: {
  person: InvestorTeamMember;
  index: number;
  last: boolean;
}) {
  const roleTitle =
    person.roleTitle && !isEmptyDisplayValue(person.roleTitle)
      ? normalizeEmptyDisplay(person.roleTitle)
      : "-";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: PEOPLE_ROW_GRID,
        alignItems: "center",
        gap: COL_GAP,
        padding: "10px 16px",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
        ...profileTableCellStyle,
      }}
    >
      <Avatar name={person.name} index={index} />
      <div style={{ minWidth: 0, textAlign: "left" }}>
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
          color: T.body,
          textAlign: "center",
          lineHeight: 1.55,
          minWidth: 0,
          fontSize: 12.5,
        }}
      >
        {roleTitle}
      </div>
    </div>
  );
}

export function InvestorPeopleCard({
  members,
  maxVisible = 6,
  fillGridCell = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? members : members.slice(0, maxVisible);
  const headerRight = useMemo(() => {
    if (members.length === 0) return undefined;
    if (expanded) return `${members.length} total`;
    return `${Math.min(maxVisible, members.length)} visible`;
  }, [expanded, maxVisible, members.length]);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH showArrow right={headerRight}>
        Investment Team
      </LinkedH>

      <ColHeader />

      <div style={{ flex: fillGridCell ? 1 : undefined, minHeight: 0 }}>
        {visible.length > 0 ? (
          visible.map((person, index) => (
            <PersonRow
              key={`${person.id ?? person.individualId ?? index}-${person.name}`}
              person={person}
              index={index}
              last={index === visible.length - 1}
            />
          ))
        ) : (
          <div
            style={{
              padding: "20px 16px",
              color: T.muted,
              fontSize: 12.5,
              textAlign: "center",
            }}
          >
            No investment team members available
          </div>
        )}
      </div>

      {members.length > maxVisible ? (
        <div
          style={{
            padding: "10px 16px 14px",
            borderTop: `1px solid ${T.hair}`,
          }}
        >
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              color: T.azure,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: T.sans,
            }}
          >
            {expanded ? "Show less" : `Expand →`}
          </button>
        </div>
      ) : null}
    </LinkPanel>
  );
}
