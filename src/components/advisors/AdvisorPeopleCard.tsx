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
import { LinkedInProfileButton } from "@/components/redesign/LinkedInProfileButton";
import { isEmptyDisplayValue, normalizeEmptyDisplay } from "@/lib/emptyDisplay";

export type AdvisorPerson = {
  id?: number;
  name: string;
  role: string;
  individualId?: number;
  linkedinUrl?: string;
};

type Tab = "current" | "past";

type Props = {
  current: AdvisorPerson[];
  past?: AdvisorPerson[];
  fillGridCell?: boolean;
};

const PEOPLE_ROW_GRID = "32px minmax(0, 1.35fr) minmax(0, 1fr) auto";
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
      <div style={{ ...tableColHeaderStyle, textAlign: "center" }}>Role</div>
      <div style={{ ...tableColHeaderStyle, textAlign: "center" }}>LinkedIn</div>
    </div>
  );
}

function PersonRow({
  person,
  index,
  last,
}: {
  person: AdvisorPerson;
  index: number;
  last: boolean;
}) {
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
        {isEmptyDisplayValue(person.role) ? "-" : normalizeEmptyDisplay(person.role)}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <LinkedInProfileButton href={person.linkedinUrl} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: "0 0 2px",
        cursor: "pointer",
        fontFamily: T.sans,
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        color: active ? T.ink : T.muted,
        borderBottom: `2px solid ${active ? T.azure : "transparent"}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

export function AdvisorPeopleCard({
  current,
  past = [],
  fillGridCell = false,
}: Props) {
  const [tab, setTab] = useState<Tab>("current");

  const activeList = tab === "current" ? current : past;

  const tabs = useMemo(
    () => [
      { id: "current" as const, label: `Current (${current.length})` },
      { id: "past" as const, label: `Past (${past.length})` },
    ],
    [current.length, past.length]
  );

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH showArrow>People</LinkedH>

      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "10px 16px 0",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        {tabs.map((item) => (
          <TabButton
            key={item.id}
            active={tab === item.id}
            label={item.label}
            onClick={() => setTab(item.id)}
          />
        ))}
      </div>

      <ColHeader />

      <div style={{ flex: fillGridCell ? 1 : undefined, minHeight: 0 }}>
        {activeList.length > 0 ? (
          activeList.map((person, index) => (
            <PersonRow
              key={`${tab}-${person.id ?? person.individualId ?? index}`}
              person={person}
              index={index}
              last={index === activeList.length - 1}
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
            No {tab} people available
          </div>
        )}
      </div>
    </LinkPanel>
  );
}
