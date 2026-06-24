"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  T,
  Pill,
} from "@/components/redesign/primitives";
import { formatJobTitles } from "@/utils/individualHelpers";
import type { IndividualRole } from "@/types/individual";

type Props = {
  roles: IndividualRole[];
  maxInitial?: number;
};

const ROLES_ROW_GRID =
  "minmax(0, 38%) minmax(0, 16%) minmax(0, 34%) minmax(0, 12%)";

const COL_GAP = 2;
const ROW_PAD = "6px 8px";

function RoleLogo({ logo, name }: { logo?: string; name: string }) {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={18}
        height={18}
        style={{
          objectFit: "contain",
          borderRadius: "50%",
          border: `1px solid ${T.divider}`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 18,
        height: 18,
        backgroundColor: T.inset,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 600,
        color: T.muted,
        border: `1px solid ${T.divider}`,
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function IndividualRolesProfilePanel({ roles, maxInitial = 8 }: Props) {
  const [showAll, setShowAll] = useState(false);

  const headerRight = useMemo(() => {
    if (roles.length === 0) return "";
    return `${roles.length} role${roles.length === 1 ? "" : "s"}`;
  }, [roles.length]);

  const displayed = showAll ? roles : roles.slice(0, maxInitial);

  return (
    <div style={{ fontFamily: T.sans, minWidth: 0, maxWidth: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>Roles</div>
        {headerRight ? (
          <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
        ) : null}
      </div>

      <div style={{ maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
        <div style={{ width: "100%", ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: ROLES_ROW_GRID,
              gap: COL_GAP,
              padding: ROW_PAD,
            }}
          >
            {(["Company", "Status", "Role", "Profile"] as const).map((h) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: "left",
                  fontSize: 10,
                  letterSpacing: 0.3,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((role, index) => {
              const last = index === displayed.length - 1;
              const companyName = role.new_company?.name || "-";
              const logo =
                role.new_company?._linkedin_data_of_new_company?.linkedin_logo ||
                role.new_company?.linkedin_data?.linkedin_logo ||
                "";
              const isCurrent = role.Status === "Current";

              return (
                <div
                  key={role.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ROLES_ROW_GRID,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: ROW_PAD,
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      overflow: "hidden",
                    }}
                  >
                    <RoleLogo logo={logo} name={companyName} />
                    {role.new_company?.id ? (
                      <Link
                        href={`/company/${role.new_company.id}`}
                        prefetch={false}
                        style={{
                          color: T.azure,
                          textDecoration: "underline",
                          fontWeight: 500,
                          fontSize: 12,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {companyName}
                      </Link>
                    ) : (
                      <span
                        style={{
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 12,
                        }}
                      >
                        {companyName}
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Pill tone={isCurrent ? "emerald" : "neutral"} style={{ fontSize: 10, padding: "1px 5px" }}>
                      {role.Status}
                    </Pill>
                  </div>
                  <div
                    style={{
                      color: T.body,
                      minWidth: 0,
                      fontSize: 12,
                      lineHeight: 1.35,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatJobTitles(role.job_titles_id)}
                  </div>
                  <div style={{ minWidth: 0, textAlign: "left" }}>
                    {role.current_employer_url ? (
                      <a
                        href={role.current_employer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: T.azure, textDecoration: "underline", fontSize: 12 }}
                      >
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: "20px 16px",
                color: T.muted,
                fontSize: "12.5px",
                textAlign: "center",
              }}
            >
              No roles available
            </div>
          )}
        </div>
      </div>

      {roles.length > maxInitial && !showAll ? (
        <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${T.hair}` }}>
          <button
            type="button"
            onClick={() => setShowAll(true)}
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
            See all {roles.length} roles
          </button>
        </div>
      ) : null}
    </div>
  );
}
