"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import CompanyLogo from "@/components/investor/CompanyLogo";
import {
  LinkPanel,
  T,
  profileTableColAlign,
  profileTableCellStyle,
  PROFILE_EVENTS_ROW_GAP,
  PROFILE_EVENTS_ROW_PAD,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";

export type InvestorPortfolioCompany = {
  id: number;
  name: string;
  sectors: string[];
  yearLabel?: string | number | null;
  relatedIndividuals?: Array<{ id: number; name: string }>;
  country?: string | null;
  logo?: string | null;
};

type Pagination = {
  curPage: number;
  pageTotal: number;
  itemsReceived: number;
  perPage: number;
};

type Props = {
  currentCompanies: InvestorPortfolioCompany[];
  pastCompanies: InvestorPortfolioCompany[];
  currentTotal?: number;
  pastTotal?: number;
  loadingCurrent?: boolean;
  loadingPast?: boolean;
  currentPagination?: Pagination;
  pastPagination?: Pagination;
  onCurrentPageChange?: (page: number) => void;
  onPastPageChange?: (page: number) => void;
  pageSize?: number;
  fillGridCell?: boolean;
};

const PORTFOLIO_ROW_GRID =
  "minmax(0, 1.35fr) minmax(0, 1.1fr) minmax(88px, auto) minmax(72px, auto) minmax(0, 1fr)";
const HEADERS = ["Name", "Sectors", "Country", "Invested", "Deal Lead"] as const;

type PortfolioTab = "current" | "past";

function sectorLabel(sectors: string[]): string {
  if (sectors.length === 0) return "-";
  return sectors.slice(0, 3).join(", ");
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
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
      {label} {count.toLocaleString("en-US")}
    </button>
  );
}

export function InvestorPortfolioProfilePanel({
  currentCompanies,
  pastCompanies,
  currentTotal,
  pastTotal,
  loadingCurrent = false,
  loadingPast = false,
  currentPagination,
  pastPagination,
  onCurrentPageChange,
  onPastPageChange,
  pageSize = 4,
  fillGridCell = false,
}: Props) {
  const [tab, setTab] = useState<PortfolioTab>("current");
  const [showAll, setShowAll] = useState(false);

  const isCurrent = tab === "current";
  const companies = isCurrent ? currentCompanies : pastCompanies;
  const loading = isCurrent ? loadingCurrent : loadingPast;
  const pagination = isCurrent ? currentPagination : pastPagination;
  const onPageChange = isCurrent ? onCurrentPageChange : onPastPageChange;

  const total =
    (isCurrent ? currentTotal : pastTotal) ??
    pagination?.itemsReceived ??
    companies.length;

  const displayed = showAll ? companies : companies.slice(0, pageSize);

  const footerLeft =
    total > 0
      ? showAll
        ? `Showing all ${total.toLocaleString("en-US")}`
        : `1–${Math.min(pageSize, total).toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`
      : "";

  const yearHeader = isCurrent ? "Invested" : "Exited";

  const tabs = useMemo(
    () => [
      {
        id: "current" as const,
        label: "Current Portfolio",
        count: currentTotal ?? currentPagination?.itemsReceived ?? currentCompanies.length,
      },
      {
        id: "past" as const,
        label: "Past Portfolio",
        count: pastTotal ?? pastPagination?.itemsReceived ?? pastCompanies.length,
      },
    ],
    [
      currentCompanies.length,
      currentPagination?.itemsReceived,
      currentTotal,
      pastCompanies.length,
      pastPagination?.itemsReceived,
      pastTotal,
    ]
  );

  if (loading) {
    return (
      <LinkPanel fillGridCell={fillGridCell}>
        <div
          style={{
            padding: "14px 16px 12px",
            borderBottom: `1px solid ${T.hair}`,
            fontSize: "13.5px",
            fontWeight: 600,
            color: T.ink,
            fontFamily: T.sans,
          }}
        >
          Portfolio
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "20px 16px",
            color: T.muted,
            fontSize: "12.5px",
            fontFamily: T.sans,
          }}
        >
          Loading portfolio…
        </div>
      </LinkPanel>
    );
  }

  return (
    <LinkPanel fillGridCell={fillGridCell} className="investor-portfolio-v3-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 16px 0",
          borderBottom: `1px solid ${T.hair}`,
          fontFamily: T.sans,
        }}
      >
        {tabs.map((item) => (
          <TabButton
            key={item.id}
            active={tab === item.id}
            label={item.label}
            count={item.count}
            onClick={() => {
              setTab(item.id);
              setShowAll(false);
            }}
          />
        ))}
        <div style={{ marginLeft: "auto", fontSize: 14, color: T.azure, fontWeight: 500, paddingBottom: 2 }}>
          →
        </div>
      </div>

      <div
        style={{
          overflowX: "auto",
          maxWidth: "100%",
          minWidth: 0,
          flex: fillGridCell ? 1 : undefined,
        }}
      >
        <div style={{ width: "100%", minWidth: 0, ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: PORTFOLIO_ROW_GRID,
              gap: PROFILE_EVENTS_ROW_GAP,
              padding: PROFILE_EVENTS_ROW_PAD.header,
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
                {h === "Invested" ? yearHeader : h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((company, rowIndex) => {
              const isLastRow = rowIndex === displayed.length - 1;
              const yearValue =
                company.yearLabel !== null &&
                company.yearLabel !== undefined &&
                String(company.yearLabel).trim().length > 0
                  ? String(company.yearLabel)
                  : "-";
              const dealLead = company.relatedIndividuals?.[0];
              const colAlign = (colIndex: number) => profileTableColAlign(colIndex);

              return (
                <div
                  key={company.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: PORTFOLIO_ROW_GRID,
                    gap: PROFILE_EVENTS_ROW_GAP,
                    alignItems: "center",
                    padding: PROFILE_EVENTS_ROW_PAD.body,
                    borderBottom: isLastRow ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div
                    style={{
                      textAlign: colAlign(0),
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <CompanyLogo logo={company.logo} name={company.name} size={24} />
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
                      minWidth: 0,
                    }}
                  >
                    {sectorLabel(company.sectors)}
                  </div>
                  <div
                    style={{
                      textAlign: colAlign(2),
                      color: T.body,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {company.country?.trim() || "-"}
                  </div>
                  <div
                    style={{
                      textAlign: colAlign(3),
                      color: T.body,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {yearValue}
                  </div>
                  <div style={{ textAlign: colAlign(4), minWidth: 0 }}>
                    {dealLead ? (
                      <Link
                        href={`/individual/${dealLead.id}`}
                        prefetch={false}
                        style={{
                          color: T.azure,
                          textDecoration: "underline",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "block",
                        }}
                      >
                        {dealLead.name}
                      </Link>
                    ) : (
                      <span style={{ color: T.muted }}>-</span>
                    )}
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
              No {isCurrent ? "current" : "past"} portfolio companies found
            </div>
          )}
        </div>
      </div>

      {total > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px 14px",
            borderTop: `1px solid ${T.hair}`,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono }}>{footerLeft}</div>
          {total > pageSize && !showAll ? (
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
              View all {total.toLocaleString("en-US")} →
            </button>
          ) : showAll && total > pageSize ? (
            <button
              type="button"
              onClick={() => setShowAll(false)}
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
              Show less
            </button>
          ) : null}
        </div>
      ) : null}

      {showAll && pagination && pagination.pageTotal > 1 && onPageChange ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "0 16px 14px",
          }}
        >
          <button
            type="button"
            onClick={() => onPageChange(pagination.curPage - 1)}
            disabled={pagination.curPage <= 1}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${T.divider}`,
              background: pagination.curPage > 1 ? T.panel : T.inset,
              color: pagination.curPage > 1 ? T.body : T.faint,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: pagination.curPage > 1 ? "pointer" : "not-allowed",
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
            disabled={pagination.curPage >= pagination.pageTotal}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${T.divider}`,
              background: pagination.curPage < pagination.pageTotal ? T.panel : T.inset,
              color: pagination.curPage < pagination.pageTotal ? T.body : T.faint,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: pagination.curPage < pagination.pageTotal ? "pointer" : "not-allowed",
              fontFamily: T.sans,
            }}
          >
            Next
          </button>
        </div>
      ) : null}
    </LinkPanel>
  );
}
