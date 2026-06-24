"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  profileTableColAlign,
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  T,
  Pill,
} from "@/components/redesign/primitives";
import type { RelatedIndividual } from "@/types/individual";

type Props = {
  individuals: RelatedIndividual[];
  maxInitial?: number;
};

const RELATED_ROW_GRID =
  "minmax(0, 1.2fr) minmax(0, 1fr) minmax(72px, auto) minmax(0, 1fr)";

const COL_GAP = 8;

function CompanyLogo({ logo, name }: { logo?: string; name: string }) {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={22}
        height={22}
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
        width: 22,
        height: 22,
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

export function IndividualRelatedProfilePanel({
  individuals,
  maxInitial = 8,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const headerRight = useMemo(() => {
    if (individuals.length === 0) return "";
    return `${individuals.length} individual${individuals.length === 1 ? "" : "s"}`;
  }, [individuals.length]);

  const displayed = showAll ? individuals : individuals.slice(0, maxInitial);

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
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>
          Related Individuals
        </div>
        {headerRight ? (
          <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
        ) : null}
      </div>

      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
        <div style={{ width: "100%", minWidth: 560, ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: RELATED_ROW_GRID,
              gap: COL_GAP,
              padding: "8px 16px",
            }}
          >
            {(["Company", "Individual", "Status", "Role"] as const).map((h, colIndex) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: profileTableColAlign(colIndex),
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((related, index) => {
              const last = index === displayed.length - 1;
              const colAlign = (colIndex: number) => profileTableColAlign(colIndex);
              const companyName = related._new_company?.name || "-";
              const logo =
                related._new_company?._linkedin_data_of_new_company?.linkedin_logo ||
                related._new_company?.linkedin_data?.linkedin_logo ||
                "";
              const isCurrent = related.Status === "Current";

              return (
                <div
                  key={related.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: RELATED_ROW_GRID,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div
                    style={{
                      textAlign: colAlign(0),
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CompanyLogo logo={logo} name={companyName} />
                    {related._new_company?.id ? (
                      <Link
                        href={`/company/${related._new_company.id}`}
                        prefetch={false}
                        style={{
                          color: T.azure,
                          textDecoration: "underline",
                          fontWeight: 500,
                          wordBreak: "break-word" as const,
                        }}
                      >
                        {companyName}
                      </Link>
                    ) : (
                      companyName
                    )}
                  </div>
                  <div style={{ textAlign: colAlign(1), minWidth: 0 }}>
                    <Link
                      href={`/individual/${related._individuals.id}`}
                      prefetch={false}
                      style={{ color: T.azure, textDecoration: "underline", fontWeight: 500 }}
                    >
                      {related._individuals.advisor_individuals}
                    </Link>
                  </div>
                  <div style={{ textAlign: colAlign(2) }}>
                    <Pill tone={isCurrent ? "emerald" : "neutral"}>{related.Status}</Pill>
                  </div>
                  <div style={{ textAlign: colAlign(3), color: T.body, minWidth: 0 }}>
                    {(related.job_titles_id || []).map((jt) => jt.job_title).join(", ") || "-"}
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
              No related individuals available
            </div>
          )}
        </div>
      </div>

      {individuals.length > maxInitial && !showAll ? (
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
            See all {individuals.length} individuals
          </button>
        </div>
      ) : null}
    </div>
  );
}
