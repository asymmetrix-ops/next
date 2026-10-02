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
  /** individual id → deals advised; adds a Deals column on the Current tab. */
  dealCounts?: Record<number, number>;
  /** Advisor firm id; scopes the Deals link to deals advised for this firm. */
  advisorId?: number;
};

const COL_GAP = 6;
const DEALS_ROW_GRID = "minmax(0, 1.2fr) minmax(0, 1.2fr) 64px 56px";

function ColHeader({ showDeals }: { showDeals: boolean }) {
  return (
    <div
      style={{
        ...tableColHeaderBarStyle,
        gridTemplateColumns: showDeals ? DEALS_ROW_GRID : MANAGEMENT_ROW_GRID,
        gap: COL_GAP,
      }}
    >
      <div style={tableColHeaderStyle}>Name</div>
      <div style={{ ...tableColHeaderStyle, textAlign: "center" }}>Role</div>
      <div style={{ ...tableColHeaderStyle, textAlign: "center" }}>LinkedIn</div>
      {showDeals ? (
        <div style={{ ...tableColHeaderStyle, textAlign: "center" }}>Deals</div>
      ) : null}
    </div>
  );
}

function dealsHref(person: AdvisorPerson, advisorId?: number): string {
  const params = new URLSearchParams({
    advised_by_individual_id: String(person.individualId),
    advised_by_name: person.name,
  });
  if (advisorId) params.set("advised_by_company_id", String(advisorId));
  return `/corporate-events?${params.toString()}`;
}

function PersonRow({
  person,
  last,
  showDeals,
  deals,
  advisorId,
}: {
  person: AdvisorPerson;
  last: boolean;
  showDeals: boolean;
  deals?: number;
  advisorId?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: showDeals ? DEALS_ROW_GRID : MANAGEMENT_ROW_GRID,
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
      {showDeals ? (
        <div style={{ textAlign: "center", paddingTop: 1 }}>
          {deals && person.individualId ? (
            <Link
              href={dealsHref(person, advisorId)}
              prefetch={false}
              style={{ color: T.azure, textDecoration: "underline", fontWeight: 500 }}
            >
              {deals}
            </Link>
          ) : (
            "-"
          )}
        </div>
      ) : null}
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
  dealCounts,
  advisorId,
}: Props) {
  const [tab, setTab] = useState<Tab>("current");

  const activeList = tab === "current" ? current : past;
  const showDeals = tab === "current" && dealCounts !== undefined;

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

      <ColHeader showDeals={showDeals} />

      <div style={{ flex: fillGridCell ? 1 : undefined, minHeight: 0 }}>
        {activeList.length > 0 ? (
          activeList.map((person, index) => (
            <PersonRow
              key={`${tab}-${person.id ?? person.individualId ?? index}`}
              person={person}
              last={index === activeList.length - 1}
              showDeals={showDeals}
              advisorId={advisorId}
              deals={person.individualId ? dealCounts?.[person.individualId] : undefined}
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
