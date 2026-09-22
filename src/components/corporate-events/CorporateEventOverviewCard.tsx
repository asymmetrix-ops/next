"use client";

import React from "react";
import { LinkPanel, LinkedH, KV, T, Pill, CappedPillTags } from "@/components/redesign/primitives";
import { EMPTY_DISPLAY, normalizeEmptyDisplay } from "@/lib/emptyDisplay";

export type CorporateEventSector = {
  id?: number;
  name: string;
};

export type CorporateEventOverviewCardProps = {
  primarySectors?: CorporateEventSector[];
  subSectors?: CorporateEventSector[];
  dateAnnounced?: string | null;
  dateClosed?: string | null;
  dealType?: string | null;
  dealStage?: string | null;
  investmentAmount?: string | null;
  investmentCurrency?: string | null;
  enterpriseValue?: string | null;
  enterpriseValueCurrency?: string | null;
  enterpriseValueSourceLabel?: string | null;
  sourceUrl?: string | null;
  fillGridCell?: boolean;
};

const EM = EMPTY_DISPLAY;

function faintDash() {
  return <span style={{ color: T.faint }}>{EM}</span>;
}

function displayText(value: string | null | undefined): React.ReactNode {
  if (!value?.trim()) return faintDash();
  const normalized = normalizeEmptyDisplay(value);
  return normalized === EM ? faintDash() : normalized;
}

function SectorTags({ sectors, tone }: { sectors: CorporateEventSector[]; tone: "coral" | "lavender" }) {
  if (sectors.length === 0) return faintDash();
  return (
    <CappedPillTags
      tone={tone}
      items={sectors.map((s, i) => ({
        key: `${s.id ?? s.name}-${i}`,
        label: s.name,
        href: s.id ? `/sector/${s.id}` : undefined,
      }))}
    />
  );
}

function SubSectorTags({ sectors }: { sectors: CorporateEventSector[] }) {
  if (sectors.length === 0) return faintDash();
  return (
    <CappedPillTags
      tone="lavender"
      items={sectors.map((s, i) => ({
        key: `${s.id ?? s.name}-${i}`,
        label: s.name,
        href: s.id ? `/sub-sector/${s.id}` : undefined,
      }))}
    />
  );
}

function amountLine(amount?: string | null, currency?: string | null): React.ReactNode {
  if (!amount?.trim()) return faintDash();
  return currency?.trim() ? `${amount} ${currency}` : amount;
}

export function CorporateEventOverviewCard({
  primarySectors = [],
  subSectors = [],
  dateAnnounced,
  dateClosed,
  dealType,
  dealStage,
  investmentAmount,
  investmentCurrency,
  enterpriseValue,
  enterpriseValueCurrency,
  enterpriseValueSourceLabel,
  sourceUrl,
  fillGridCell = false,
}: CorporateEventOverviewCardProps) {
  const rows: { k: string; v: React.ReactNode; show?: boolean }[] = [
    { k: "Sector(s)", v: <SectorTags sectors={primarySectors} tone="coral" /> },
    {
      k: "Sub-sector(s)",
      v: <SubSectorTags sectors={subSectors} />,
      show: subSectors.length > 0,
    },
    { k: "Date announced", v: displayText(dateAnnounced) },
    { k: "Date closed", v: displayText(dateClosed) },
    {
      k: "Deal type",
      v: dealType?.trim() ? <Pill tone="azure">{dealType}</Pill> : faintDash(),
    },
    {
      k: "Deal stage",
      v: dealStage?.trim() ? displayText(dealStage) : faintDash(),
      show: Boolean(dealStage?.trim()),
    },
    {
      k: "Investment amount (m)",
      v: amountLine(investmentAmount, investmentCurrency),
    },
    {
      k: "Enterprise value (m)",
      v: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {amountLine(enterpriseValue, enterpriseValueCurrency)}
          {enterpriseValueSourceLabel ? (
            <Pill tone="neutral" style={{ fontSize: 10, padding: "1px 6px" }}>
              {enterpriseValueSourceLabel}
            </Pill>
          ) : null}
        </span>
      ),
    },
    {
      k: "Source",
      v: sourceUrl?.trim() ? (
        <a
          href={sourceUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: T.azure, textDecoration: "underline" }}
        >
          View source
        </a>
      ) : (
        faintDash()
      ),
      show: Boolean(sourceUrl?.trim()),
    },
  ];

  const visible = rows.filter((r) => r.show !== false);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Overview</LinkedH>
      <div
        style={{
          padding: "2px 14px 8px",
          ...(fillGridCell
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start" }
            : {}),
        }}
      >
        {visible.map((row, i) => (
          <KV key={row.k} k={row.k} v={row.v} last={i === visible.length - 1} />
        ))}
      </div>
    </LinkPanel>
  );
}
