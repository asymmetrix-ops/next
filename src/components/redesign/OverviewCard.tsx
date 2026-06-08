"use client";
/**
 * OverviewCard — redesign/OverviewCard.jsx converted to TypeScript.
 * Sector tags + key facts (ownership, lifecycle, HQ, raised, employees…).
 * Uses KV rows + TagRow pills from primitives, matching the V3 design token set.
 */
import React from "react";
import Link from "next/link";
import { LinkPanel, LinkedH, KV, Delta, Pill, T } from "./primitives";

export type OverviewSector = {
  name: string;
  /** /sector/:id or /sub-sector/:id */
  href?: string;
};

export type OverviewInvestor = {
  id: number;
  name: string;
};

export type OverviewCardProps = {
  transactionStatus?: string | null;
  primarySectors?: OverviewSector[];
  secondarySectors?: OverviewSector[];
  yearFounded?: string | number | null;
  website?: string | null;
  /** pre-formatted display label, e.g. "asymmetrix.io" */
  websiteLabel?: string | null;
  ownership?: string | null;
  hq?: string | null;
  lifecycle?: string | null;
  totalAmountRaised?: string | null;
  employees?: number | null;
  employeesYoY?: string | null;
  parentCompany?: { id?: number; name: string } | null;
  investors?: OverviewInvestor[];
  investorsLoading?: boolean;
  /** e.g. "3 years" or "< 1 year" — pass pre-formatted string */
  lastInvestment?: string | null;
  ticker?: string | null;
  fillGridCell?: boolean;
};

const EM = "-";

function SectorTags({
  sectors,
  tone,
}: {
  sectors: OverviewSector[];
  tone: "coral" | "lavender";
}) {
  if (sectors.length === 0) return <span style={{ color: T.faint }}>{EM}</span>;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {sectors.map((s) =>
        s.href ? (
          <Link key={s.name} href={s.href} prefetch={false} style={{ textDecoration: "none" }}>
            <Pill tone={tone}>{s.name}</Pill>
          </Link>
        ) : (
          <Pill key={s.name} tone={tone}>{s.name}</Pill>
        )
      )}
    </div>
  );
}

function TransactionStatusHighlight({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        columnGap: 4,
        alignItems: "center",
        backgroundColor: "#ffffff",
        border: "1px solid #bfdbfe",
        borderRadius: 12,
        boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.10)",
        padding: "8px 8px",
        margin: "8px 0 10px",
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: T.muted,
          fontWeight: 400,
          whiteSpace: "nowrap",
        }}
      >
        Transaction Status:
      </span>
      <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        <span
          className="transaction-status-pill"
          style={{
            backgroundColor: "#dcfce7",
            color: "#166534",
            border: "1.5px solid #4ade80",
            borderRadius: "999px",
            fontSize: 13,
            fontWeight: 500,
            padding: "5px 10px",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function InvestorTags({ investors }: { investors: OverviewInvestor[] }) {
  if (investors.length === 0) return <span style={{ color: T.faint }}>{EM}</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {investors.map((inv) => (
        <Link key={inv.id} href={`/investors/${inv.id}`} prefetch={false} style={{ textDecoration: "none" }}>
          <Pill tone="azure">{inv.name}</Pill>
        </Link>
      ))}
    </div>
  );
}

export function OverviewCard({
  transactionStatus,
  primarySectors = [],
  secondarySectors = [],
  yearFounded,
  website,
  websiteLabel,
  ownership,
  hq,
  lifecycle,
  totalAmountRaised,
  employees,
  employeesYoY,
  parentCompany,
  investors = [],
  investorsLoading,
  lastInvestment,
  ticker,
  fillGridCell = false,
}: OverviewCardProps) {
  const hasParent = Boolean(parentCompany?.name);

  const rows: { k: string; v: React.ReactNode; show?: boolean }[] = [
    {
      k: "Primary sector(s)",
      v: (
        <SectorTags sectors={primarySectors} tone="coral" />
      ),
    },
    {
      k: "Secondary sector(s)",
      v: (
        <SectorTags sectors={secondarySectors} tone="lavender" />
      ),
    },
    {
      k: "Year founded",
      v: yearFounded ?? <span style={{ color: T.faint }}>{EM}</span>,
    },
    {
      k: "Website",
      v: website?.trim() ? (
        <a
          href={/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: T.azure, textDecoration: "none" }}
        >
          {websiteLabel || website.trim()}
        </a>
      ) : (
        <span style={{ color: T.faint }}>{EM}</span>
      ),
    },
    {
      k: "Ownership",
      v: ownership?.trim() || <span style={{ color: T.faint }}>{EM}</span>,
    },
    { k: "HQ", v: hq?.trim() || <span style={{ color: T.faint }}>{EM}</span> },
    {
      k: "Lifecycle stage",
      v: lifecycle?.trim() || <span style={{ color: T.faint }}>{EM}</span>,
    },
    {
      k: "Total amount raised",
      v: totalAmountRaised ? (
        <span style={{ fontFamily: T.mono }}>{totalAmountRaised}</span>
      ) : (
        <span style={{ color: T.faint }}>{EM}</span>
      ),
    },
    {
      k: "Employees",
      v: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {employees != null ? (
            <>
              {employees.toLocaleString("en-US")}
              {employeesYoY && <Delta value={employeesYoY} />}
            </>
          ) : (
            <span style={{ color: T.faint }}>{EM}</span>
          )}
        </span>
      ),
    },
    {
      k: "Ticker",
      show: Boolean(ticker),
      v: <span style={{ fontFamily: T.mono }}>{ticker}</span>,
    },
    {
      k: "Parent company",
      show: hasParent,
      v: parentCompany ? (
        parentCompany.id ? (
          <Link href={`/new_company/${parentCompany.id}`} prefetch={false} style={{ textDecoration: "none" }}>
            <Pill tone="neutral">{parentCompany.name}</Pill>
          </Link>
        ) : (
          <span>{parentCompany.name}</span>
        )
      ) : null,
    },
    {
      k: "Investors",
      show: !hasParent,
      v: investorsLoading ? (
        <span style={{ color: T.faint }}>Loading…</span>
      ) : (
        <InvestorTags investors={investors} />
      ),
    },
    {
      k: "Yrs since last inv.",
      show: !hasParent,
      v: lastInvestment ?? <span style={{ color: T.faint }}>{EM}</span>,
    },
  ];

  const visible = rows.filter((r) => r.show !== false);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH right={ticker ? undefined : undefined}>Overview</LinkedH>
      <div
        style={{
          padding: "2px 14px 8px",
          ...(fillGridCell
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start" }
            : {}),
        }}
      >
        {transactionStatus ? (
          <TransactionStatusHighlight label={transactionStatus} />
        ) : null}
        {visible.map((row, i) => (
          <KV
            key={row.k}
            k={row.k}
            v={row.v}
            last={i === visible.length - 1}
          />
        ))}
      </div>
    </LinkPanel>
  );
}
