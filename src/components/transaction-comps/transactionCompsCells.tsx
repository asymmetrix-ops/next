import React from "react";
import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import { SEARCH_TABLE_ENTITY_LOGO_SIZE_PX } from "@/components/search/searchTableStyles";
import { MultipleBasisTag } from "./MultipleBasisTag";
import type { MultipleBasis, TransactionCompRow } from "./transactionCompsTypes";

export const NUMERIC_COLUMNS = new Set([
  "ev", "ev_revenue", "ev_ebitda", "revenue", "ebitda",
  "rev_growth", "ebitda_margin", "rule_of_40",
]);

/** Column key -> API `sort_by` value, for columns the header can sort. */
export const SORT_BY_COLUMN: Record<string, string> = {
  ev: "ev",
  ev_revenue: "ev_revenue",
  ev_ebitda: "ev_ebitda",
  deal_date: "deal_date",
  revenue: "revenue",
  ebitda: "ebitda",
  rev_growth: "rev_growth",
  ebitda_margin: "ebitda_margin",
  rule_of_40: "rule_of_40",
};

/** Empty values stay blank: a dash looks misaligned next to right-aligned numbers. */
const dash = null;
const num = (v: number | null | undefined, digits: number, suffix = "") =>
  v == null ? dash : `${v.toLocaleString(undefined, { maximumFractionDigits: digits })}${suffix}`;
const text = (v?: string | number | null) => (v == null || v === "" ? dash : v);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(v?: string | null) {
  if (!v) return dash;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v;
  return <span className="whitespace-nowrap">{`${m[3]} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`}</span>;
}

/** A multiple with its basis tag; the tag only renders when the API gives a basis. */
function multiple(v: number | null | undefined, basis?: MultipleBasis | null) {
  if (v == null) return dash;
  return (
    <span className="whitespace-nowrap">
      {num(v, 1, "x")}
      <MultipleBasisTag basis={basis} />
    </span>
  );
}

/** A zero from the API means "not available" for monetary values. */
const money = (v: number | null | undefined) => (v ? num(v, 1) : dash);

export function renderTransactionCompCell(row: TransactionCompRow, key: string): React.ReactNode {
  switch (key) {
    case "company":
      return (
        <div className="company-table-entity-name-cell">
          <CompanyAvatar name={row.company_name} logo={row.logo} size={SEARCH_TABLE_ENTITY_LOGO_SIZE_PX} />
          <div className="company-table-entity-name-text">
            <Link
              href={`/company/${row.company_id}`}
              className="company-table-entity-name company-table-entity-name-link"
              title={row.former_name ? `Formerly ${row.former_name}` : undefined}
              style={{ color: "#0A0E1A" }}
            >
              {row.company_name}
            </Link>
            {row.hq_country && (
              <div className="company-table-entity-subtitle">{row.hq_country}</div>
            )}
          </div>
        </div>
      );
    case "ev": return money(row.ev_m ?? row.ev_m_usd);
    case "ev_revenue": return multiple(row.ev_revenue, row.ev_revenue_basis);
    case "ev_ebitda": return multiple(row.ev_ebitda, row.ev_ebitda_basis);
    case "deal_date": return fmtDate(row.deal_date);
    case "acquirer_investor":
      return row.acquirers?.length
        ? row.acquirers.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 && ", "}
              <Link href={`/investors/${a.id}`} className="text-blue-700 hover:underline">{a.name}</Link>
            </React.Fragment>
          ))
        : dash;
    case "corporate_events":
      return row.corporate_event ? (
        <Link href={`/corporate-event/${row.corporate_event.id}`} className="font-medium text-blue-700 hover:underline">
          {row.corporate_event.name}
        </Link>
      ) : dash;
    case "sector":
      return row.primary_sectors?.length ? (
        <SearchEntityMultiValueCell
          items={row.primary_sectors.map((s) => ({
            name: s.name,
            href: `/sector/${s.id}`,
            key: `sector-${s.id}`,
          }))}
        />
      ) : dash;
    case "ownership": return text(row.ownership);
    case "hq_city": return text(row.hq_city);
    case "hq_country": return text(row.hq_country);
    case "deal_type": return text(row.deal_type);
    case "revenue": return money(row.revenue_m ?? row.revenue_m_usd);
    case "ebitda": return money(row.ebitda_m ?? row.ebitda_m_usd);
    case "rev_growth": return num(row.revenue_growth_pc, 1, "%");
    case "ebitda_margin": return num(row.ebitda_margin_pc, 1, "%");
    case "rule_of_40": return num(row.rule_of_40, 0);
    default: return dash;
  }
}

export function transactionCompCsvValue(row: TransactionCompRow, key: string): string | number {
  const v: unknown = (() => {
    switch (key) {
      case "company": return row.company_name;
      case "ev": return row.ev_m ?? row.ev_m_usd;
      case "ev_revenue": return row.ev_revenue;
      case "ev_ebitda": return row.ev_ebitda;
      case "deal_date": return row.deal_date;
      case "acquirer_investor": return row.acquirers?.map((a) => a.name).join("; ");
      case "corporate_events": return row.corporate_event?.name;
      case "sector": return row.primary_sectors?.map((s) => s.name).join("; ");
      case "ownership": return row.ownership;
      case "hq_city": return row.hq_city;
      case "hq_country": return row.hq_country;
      case "deal_type": return row.deal_type;
      case "revenue": return row.revenue_m ?? row.revenue_m_usd;
      case "ebitda": return row.ebitda_m ?? row.ebitda_m_usd;
      case "rev_growth": return row.revenue_growth_pc;
      case "ebitda_margin": return row.ebitda_margin_pc;
      case "rule_of_40": return row.rule_of_40;
      default: return "";
    }
  })();
  return v == null ? "" : (v as string | number);
}
