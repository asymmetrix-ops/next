"use client";
/**
 * OverviewCard — redesign/OverviewCard.jsx converted to TypeScript.
 * Sector tags + key facts (ownership, lifecycle, HQ, raised, employees…).
 * Uses KV rows + TagRow pills from primitives, matching the V3 design token set.
 */
import React from "react";
import Link from "next/link";
import { LinkPanel, LinkedH, KV, Delta, Pill, T } from "./primitives";
import { EMPTY_DISPLAY, isEmptyDisplayValue, normalizeEmptyDisplay } from "@/lib/emptyDisplay";
import { normalizeHoldingPeriodDisplay } from "@/lib/holdingPeriod";

export type OverviewSector = {
  name: string;
  /** /sector/:id or /sub-sector/:id */
  href?: string;
};

export type OverviewInvestor = {
  id: number;
  name: string;
};

export type OverviewHoldingPeriod = {
  investorName: string;
  investorId?: number | null;
  /** Pre-formatted "X years Y months" (or "X months") — render directly. */
  display: string;
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
  /**
   * Gate on `hasHoldingPeriod` first — when there is no acquisition Corporate
   * Event at all for this company, the row should not render, not show `—`.
   */
  hasHoldingPeriod?: boolean;
  holdingPeriod?: OverviewHoldingPeriod | null;
  fillGridCell?: boolean;
};

const EM = EMPTY_DISPLAY;

// `KV`'s default label column is `minmax(118px, auto)`, and each KV row is
// its own independent grid — so a long label like "Time since last
// investment" auto-widens only *that* row, leaving every other row's value
// column starting at a different x position. Pin a single fixed width wide
// enough for the longest label so every value in this card starts flush.
const OVERVIEW_KV_STYLE: React.CSSProperties = {
  gridTemplateColumns: "192px 1fr",
};

function faintDash() {
  return <span style={{ color: T.faint }}>{EM}</span>;
}

function displayText(value: string | number | null | undefined): React.ReactNode {
  if (value === null || value === undefined) return faintDash();
  if (typeof value === "number") return String(value);
  const normalized = normalizeEmptyDisplay(value);
  return normalized === EM ? faintDash() : normalized;
}

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

function transactionStatusTone(label: string): { bg: string; fg: string; dot: string } {
  const s = label.toLowerCase();
  if (s.includes("reported")) return { bg: "#E4F5EC", fg: "#0F7040", dot: "#17A05C" };
  if (s.includes("rumoured") || s.includes("rumored"))
    return { bg: "#FEF6E0", fg: "#7A5605", dot: "#E0A32E" };
  if (s.includes("hold")) return { bg: "#F5F7FD", fg: "#566078", dot: "#B4BCCB" };
  return { bg: "#F1F4FE", fg: "#1F35C4", dot: "#3D5BF3" };
}

function TransactionStatusHighlight({ label }: { label: string }) {
  const tone = transactionStatusTone(label);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        backgroundColor: T.azureSoft,
        border: `1px solid #E2E8FD`,
        borderRadius: 12,
        padding: "11px 13px",
        margin: "0 0 12px",
        fontSize: 12.5,
        fontWeight: 600,
        color: "#3D4657",
      }}
    >
      Transaction status
      <span
        className="transaction-status-pill"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          backgroundColor: tone.bg,
          color: tone.fg,
          borderRadius: "999px",
          fontSize: 12,
          fontWeight: 700,
          padding: "0 10px",
          height: 24,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: tone.dot,
            flexShrink: 0,
          }}
        />
        {label}
      </span>
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
  hasHoldingPeriod = false,
  holdingPeriod,
  fillGridCell = false,
}: OverviewCardProps) {
  const hasParent = Boolean(parentCompany?.name);
  const normalizedHoldingPeriodDisplay = normalizeHoldingPeriodDisplay(
    holdingPeriod?.display
  );

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
      v: displayText(yearFounded),
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
      v: displayText(ownership),
    },
    { k: "HQ", v: displayText(hq) },
    {
      k: "Lifecycle stage",
      v: displayText(lifecycle),
    },
    {
      k: "Total amount raised",
      v:
        totalAmountRaised && !isEmptyDisplayValue(totalAmountRaised) ? (
          <span style={{ fontFamily: T.mono }}>{normalizeEmptyDisplay(totalAmountRaised)}</span>
        ) : (
          faintDash()
        ),
    },
    {
      k: "Holding period",
      show:
        hasHoldingPeriod &&
        Boolean(holdingPeriod) &&
        Boolean(normalizedHoldingPeriodDisplay),
      v: holdingPeriod ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {holdingPeriod.investorId ? (
            <Link
              href={`/investors/${holdingPeriod.investorId}`}
              prefetch={false}
              style={{ textDecoration: "none" }}
            >
              <Pill tone="azure">{holdingPeriod.investorName}</Pill>
            </Link>
          ) : (
            <Pill tone="azure">{holdingPeriod.investorName}</Pill>
          )}
          <span>·</span>
          <span>{normalizedHoldingPeriodDisplay}</span>
        </span>
      ) : null,
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
          <Link href={`/company/${parentCompany.id}`} prefetch={false} style={{ textDecoration: "none" }}>
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
      k: "Time since last investment",
      show: !hasParent,
      v: lastInvestment && !isEmptyDisplayValue(lastInvestment)
        ? lastInvestment
        : faintDash(),
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
            style={OVERVIEW_KV_STYLE}
          />
        ))}
      </div>
    </LinkPanel>
  );
}
