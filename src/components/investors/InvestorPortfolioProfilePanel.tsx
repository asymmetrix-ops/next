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
} from "@/components/redesign/primitives";

export type InvestorPortfolioCompany = {
  id: number;
  name: string;
  sectors: string[];
  yearLabel?: string | number | null;
  relatedIndividuals?: Array<{ id: number; name: string }>;
  linkedinMembers?: number | null;
  country?: string | null;
  logo?: string | null;
};

type Pagination = {
  curPage: number;
  pageTotal: number;
  prevPage: number | null;
  nextPage: number | null;
};

type Props = {
  title: string;
  variant: "current" | "past";
  companies: InvestorPortfolioCompany[];
  loading?: boolean;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  maxInitial?: number;
};

const PORTFOLIO_ROW_GRID =
  "minmax(0, 1.35fr) minmax(0, 1.1fr) minmax(72px, auto) minmax(0, 1fr) minmax(88px, auto) minmax(72px, auto)";

const COL_GAP = 8;

const HEADERS = [
  "Name",
  "Sectors",
  "Year",
  "Individuals",
  "LinkedIn",
  "Country",
] as const;

function formatNumber(num: number | null | undefined): string {
  if (num === undefined || num === null) return "-";
  return num.toLocaleString("en-US");
}

function CompanyLogo({ logo, name }: { logo?: string | null; name: string }) {
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

export function InvestorPortfolioProfilePanel({
  title,
  variant,
  companies,
  loading = false,
  pagination,
  onPageChange,
  maxInitial = 8,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const yearHeader = variant === "past" ? "Year Exited" : "Year Invested";

  const headerRight = useMemo(() => {
    if (loading) return "";
    const n = companies.length;
    if (n === 0) return "";
    return `${n} compan${n === 1 ? "y" : "ies"}`;
  }, [companies.length, loading]);

  const displayed = showAll ? companies : companies.slice(0, maxInitial);

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "20px 16px",
          color: T.muted,
          fontSize: "12.5px",
          fontFamily: T.sans,
        }}
      >
        Loading {variant === "past" ? "past" : "current"} portfolio…
      </div>
    );
  }

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
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>{title}</div>
        {headerRight ? (
          <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
        ) : null}
      </div>

      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
        <div style={{ width: "100%", minWidth: 0, ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: PORTFOLIO_ROW_GRID,
              gap: COL_GAP,
              padding: "8px 16px",
            }}
          >
            {HEADERS.map((h, colIndex) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: profileTableColAlign(colIndex),
                }}
              >
                {h === "Year" ? yearHeader : h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((company, index) => {
              const last = index === displayed.length - 1;
              const colAlign = (colIndex: number) => profileTableColAlign(colIndex);
              const yearValue =
                company.yearLabel !== null &&
                company.yearLabel !== undefined &&
                String(company.yearLabel).trim().length > 0
                  ? String(company.yearLabel)
                  : "-";

              return (
                <div
                  key={company.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: PORTFOLIO_ROW_GRID,
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
                    <CompanyLogo logo={company.logo} name={company.name} />
                    <Link
                      href={`/company/${company.id}`}
                      prefetch={false}
                      style={{
                        color: T.azure,
                        textDecoration: "underline",
                        fontWeight: 500,
                        minWidth: 0,
                        wordBreak: "break-word" as const,
                      }}
                    >
                      {company.name}
                    </Link>
                  </div>
                  <div
                    style={{
                      textAlign: colAlign(1),
                      color: T.body,
                      minWidth: 0,
                      wordBreak: "break-word" as const,
                    }}
                  >
                    {company.sectors.length > 0
                      ? `${company.sectors.slice(0, 3).join(", ")}${company.sectors.length > 3 ? "…" : ""}`
                      : "-"}
                  </div>
                  <div style={{ textAlign: colAlign(2), color: T.body }}>{yearValue}</div>
                  <div
                    style={{
                      textAlign: colAlign(3),
                      color: T.muted,
                      minWidth: 0,
                    }}
                  >
                    {company.relatedIndividuals && company.relatedIndividuals.length > 0 ? (
                      company.relatedIndividuals.slice(0, 3).map((individual, idx, arr) => (
                        <span key={individual.id}>
                          <Link
                            href={`/individual/${individual.id}`}
                            prefetch={false}
                            style={{ color: T.azure, textDecoration: "underline" }}
                          >
                            {individual.name}
                          </Link>
                          {idx < arr.length - 1 ? ", " : ""}
                        </span>
                      ))
                    ) : (
                      "-"
                    )}
                    {company.relatedIndividuals && company.relatedIndividuals.length > 3 ? "…" : null}
                  </div>
                  <div style={{ textAlign: colAlign(4), color: T.body, fontFamily: T.mono }}>
                    {formatNumber(company.linkedinMembers ?? null)}
                  </div>
                  <div style={{ textAlign: colAlign(5), color: T.body }}>
                    {company.country?.trim() || "-"}
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
              No {variant === "past" ? "past" : "current"} portfolio companies found
            </div>
          )}
        </div>
      </div>

      {companies.length > maxInitial && !showAll ? (
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
            See all {companies.length} companies
          </button>
        </div>
      ) : null}

      {pagination && pagination.pageTotal > 1 && onPageChange ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 16px 14px",
            borderTop: `1px solid ${T.hair}`,
          }}
        >
          <button
            type="button"
            onClick={() => onPageChange(pagination.curPage - 1)}
            disabled={!pagination.prevPage}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${T.divider}`,
              background: pagination.prevPage ? T.panel : T.inset,
              color: pagination.prevPage ? T.body : T.faint,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: pagination.prevPage ? "pointer" : "not-allowed",
              fontFamily: T.sans,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 12.5, color: T.muted }}>
            Page {pagination.curPage} of {pagination.pageTotal}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(pagination.curPage + 1)}
            disabled={!pagination.nextPage}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${T.divider}`,
              background: pagination.nextPage ? T.panel : T.inset,
              color: pagination.nextPage ? T.body : T.faint,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: pagination.nextPage ? "pointer" : "not-allowed",
              fontFamily: T.sans,
            }}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
