"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import CompanyLogo from "@/components/investor/CompanyLogo";
import {
  profileTableColAlign,
  profileTableCellStyle,
  PROFILE_EVENTS_ROW_GAP,
  PROFILE_EVENTS_ROW_PAD,
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
  "minmax(0, 1.35fr) minmax(88px, auto) minmax(0, 1fr)";

export function IndividualRolesProfilePanel({ roles, maxInitial = 8 }: Props) {
  const [showAll, setShowAll] = useState(false);

  const headerRight = useMemo(() => {
    if (roles.length === 0) return "";
    return `${roles.length} role${roles.length === 1 ? "" : "s"}`;
  }, [roles.length]);

  const displayed = showAll ? roles : roles.slice(0, maxInitial);
  const colAlign = (colIndex: number) => profileTableColAlign(colIndex);

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
              gap: PROFILE_EVENTS_ROW_GAP,
              padding: PROFILE_EVENTS_ROW_PAD.header,
            }}
          >
            {(["Company", "Status", "Role"] as const).map((h, colIndex) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: colAlign(colIndex),
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
              const companyHref = role.new_company?._is_that_investor
                ? `/investors/${role.new_company.id}`
                : role.new_company?.id
                  ? `/company/${role.new_company.id}`
                  : undefined;

              return (
                <div
                  key={role.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ROLES_ROW_GRID,
                    gap: PROFILE_EVENTS_ROW_GAP,
                    alignItems: "center",
                    padding: PROFILE_EVENTS_ROW_PAD.body,
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div
                    style={{
                      textAlign: colAlign(0),
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      overflow: "hidden",
                    }}
                  >
                    <CompanyLogo logo={logo} name={companyName} size={18} />
                    {companyHref ? (
                      <Link
                        href={companyHref}
                        prefetch={false}
                        style={{
                          color: T.azure,
                          textDecoration: "underline",
                          fontWeight: 500,
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
                        }}
                      >
                        {companyName}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: colAlign(1), minWidth: 0 }}>
                    <Pill tone={isCurrent ? "emerald" : "neutral"}>{role.Status}</Pill>
                  </div>
                  <div
                    style={{
                      textAlign: colAlign(2),
                      color: T.body,
                      minWidth: 0,
                      lineHeight: 1.55,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatJobTitles(role.job_titles_id) || "-"}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: "24px 16px",
                color: T.muted,
                fontSize: "12.5px",
                textAlign: "center",
                fontFamily: T.sans,
              }}
            >
              No roles available
            </div>
          )}
        </div>
      </div>

      {roles.length > maxInitial ? (
        <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
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
            {showAll ? "Show less" : "See more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
