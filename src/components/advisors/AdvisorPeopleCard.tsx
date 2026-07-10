"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  LinkPanel,
  LinkedH,
  T,
  MANAGEMENT_ROW_GRID,
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

const COL_GAP = 6;

function ColHeader() {
  return (
    <div
      style={{
        ...tableColHeaderBarStyle,
        gridTemplateColumns: MANAGEMENT_ROW_GRID,
        gap: COL_GAP,
      }}
    >
      <div style={tableColHeaderStyle}>Name</div>
      <div style={{ ...tableColHeaderStyle, textAlign: "center" }}>Role</div>
      <div style={{ ...tableColHeaderStyle, textAlign: "center" }}>LinkedIn</div>
    </div>
  );
}

function PersonRow({
  person,
  last,
}: {
  person: AdvisorPerson;
  last: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: MANAGEMENT_ROW_GRID,
        alignItems: "start",
        gap: COL_GAP,
        padding: "10px 16px",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
        ...profileTableCellStyle,
      }}
    >
      <div style={{ minWidth: 0, paddingTop: 1, textAlign: "left" }}>
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
              textAlign: "left",
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
              textAlign: "left",
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
          paddingTop: 1,
        }}
      >
        {isEmptyDisplayValue(person.role) ? "-" : normalizeEmptyDisplay(person.role)}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: 1,
        }}
      >
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
        fontSize: 13,
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
              last={index === activeList.length - 1}
            />
          ))
        ) : (
          <div
            style={{
              padding: "20px 16px",
              color: T.muted,
              fontSize: "12.5px",
              textAlign: "center",
              fontFamily: T.sans,
            }}
          >
            No {tab} people available
          </div>
        )}
      </div>
    </LinkPanel>
  );
}
