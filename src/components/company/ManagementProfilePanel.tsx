"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { CorporateEventsProfileTokens } from "@/components/corporate-events/CorporateEventsProfilePanel";

export type ManagementProfilePerson = {
  id?: number;
  name: string;
  role: string;
  individualId?: number;
};

type ManagementProfilePanelProps = {
  tokens: CorporateEventsProfileTokens;
  current: ManagementProfilePerson[];
  past: ManagementProfilePerson[];
  maxInitialPerSection?: number;
};

function LogoLetter({
  name,
  T,
}: {
  name: string;
  T: CorporateEventsProfileTokens;
}) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 5,
        background: T.inset,
        color: T.body,
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: T.sans,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

export const ManagementProfilePanel: React.FC<ManagementProfilePanelProps> = ({
  tokens: T,
  current,
  past,
  maxInitialPerSection = 8,
}) => {
  const [expandCurrent, setExpandCurrent] = useState(false);
  const [expandPast, setExpandPast] = useState(false);

  const headerRight = useMemo(() => {
    const parts: string[] = [];
    if (current.length)
      parts.push(
        `${current.length} current`
      );
    if (past.length) parts.push(`${past.length} past`);
    return parts.join(" · ");
  }, [current.length, past.length]);

  const showCurrent = expandCurrent
    ? current
    : current.slice(0, maxInitialPerSection);
  const showPast = expandPast ? past : past.slice(0, maxInitialPerSection);

  const renderTable = (rows: ManagementProfilePerson[]) => (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          minWidth: 420,
          borderCollapse: "collapse",
          fontSize: "12.5px",
        }}
      >
        <thead>
          <tr style={{ background: T.paper }}>
            {(["Name", "Role"] as const).map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  color: T.muted,
                  fontSize: "11px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  borderBottom: `1px solid ${T.hair}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((person, index) => {
            const last = index === rows.length - 1;
            const rowKey = person.id ?? person.individualId ?? index;
            return (
              <tr
                key={rowKey}
                className="management-profile-row"
                style={{
                  borderBottom: last ? "none" : `1px solid ${T.hair}`,
                }}
              >
                <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <LogoLetter name={person.name} T={T} />
                    {person.individualId ? (
                      <Link
                        href={`/individual/${person.individualId}`}
                        prefetch={false}
                        style={{
                          color: T.azure,
                          fontWeight: 500,
                          textDecoration: "underline",
                          minWidth: 0,
                          wordBreak: "break-word" as const,
                        }}
                      >
                        {person.name}
                      </Link>
                    ) : (
                      <span
                        style={{
                          fontWeight: 500,
                          color: T.ink,
                          wordBreak: "break-word" as const,
                        }}
                      >
                        {person.name}
                      </span>
                    )}
                  </div>
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.muted,
                    verticalAlign: "top",
                    lineHeight: 1.45,
                  }}
                >
                  {person.role?.trim() ? person.role : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const sectionLabel = (label: string) => (
    <div
      style={{
        padding: "12px 16px 0",
        fontSize: "11px",
        fontWeight: 600,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      {label}
    </div>
  );

  return (
    <div style={{ fontFamily: T.sans, paddingBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div
          style={{
            fontSize: "13.5px",
            fontWeight: 600,
            color: T.ink,
          }}
        >
          Management
        </div>
        {headerRight ? (
          <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
        ) : null}
      </div>

      {current.length > 0 && (
        <>
          {current.length > 0 && past.length > 0 ? sectionLabel("Current") : null}
          {renderTable(showCurrent)}
          {current.length > maxInitialPerSection ? (
            <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
              <button
                type="button"
                onClick={() => setExpandCurrent(!expandCurrent)}
                style={{
                  background: "none",
                  border: "none",
                  color: T.azure,
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: 500,
                  fontFamily: T.sans,
                }}
              >
                {expandCurrent ? "Show less" : "See more"}
              </button>
            </div>
          ) : null}
        </>
      )}

      {past.length > 0 && (
        <>
          {sectionLabel("Past")}
          {renderTable(showPast)}
          {past.length > maxInitialPerSection ? (
            <div style={{ textAlign: "center", padding: "10px 0 0" }}>
              <button
                type="button"
                onClick={() => setExpandPast(!expandPast)}
                style={{
                  background: "none",
                  border: "none",
                  color: T.azure,
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: 500,
                  fontFamily: T.sans,
                }}
              >
                {expandPast ? "Show less" : "See more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
