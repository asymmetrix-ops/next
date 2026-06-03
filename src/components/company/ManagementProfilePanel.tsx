"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { CorporateEventsProfileTokens } from "@/components/corporate-events/CorporateEventsProfilePanel";
import { LinkedInProfileButton } from "@/components/redesign/LinkedInProfileButton";

export type ManagementProfilePerson = {
  id?: number;
  name: string;
  role: string;
  individualId?: number;
  linkedinUrl?: string;
};

type ManagementProfilePanelProps = {
  tokens: CorporateEventsProfileTokens;
  current: ManagementProfilePerson[];
  past: ManagementProfilePerson[];
  maxInitialPerSection?: number;
};

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
    if (current.length) parts.push(`${current.length} current`);
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
          minWidth: 480,
          borderCollapse: "collapse",
          fontSize: "12.5px",
        }}
      >
        <thead>
          <tr style={{ background: T.paper }}>
            {(["Name", "Role", "LinkedIn"] as const).map((h) => (
              <th
                key={h}
                style={{
                  textAlign: h === "LinkedIn" ? "center" : "left",
                  padding: "10px 12px",
                  color: T.muted,
                  fontSize: "10.5px",
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
                <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
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
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.body,
                    verticalAlign: "middle",
                    lineHeight: 1.45,
                  }}
                >
                  {person.role?.trim() ? person.role : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    verticalAlign: "middle",
                    textAlign: "center",
                  }}
                >
                  <LinkedInProfileButton href={person.linkedinUrl} />
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
