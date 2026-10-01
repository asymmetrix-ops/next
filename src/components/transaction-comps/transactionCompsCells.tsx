import React from "react";
import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import type { TransactionCompRow } from "./transactionCompsTypes";

export const NUMERIC_COLUMNS = new Set([
  "ev", "ev_revenue", "ev_ebitda", "ev_ebit", "revenue", "ebitda",
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
  ev_ebit: "ev_ebit",
  rule_of_40: "rule_of_40",
};

const dash = <span className="text-gray-300">–</span>;
const num = (v: number | null | undefined, digits: number, suffix = "") =>
  v == null ? dash : `${v.toLocaleString(undefined, { maximumFractionDigits: digits })}${suffix}`;
const text = (v?: string | number | null) => (v == null || v === "" ? dash : v);

function fmtDate(v?: string | null) {
  if (!v) return dash;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function renderTransactionCompCell(row: TransactionCompRow, key: string): React.ReactNode {
  switch (key) {
    case "company":
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyAvatar name={row.company_name} logo={row.logo} size={28} />
          <div className="min-w-0">
            <Link href={`/company/${row.company_id}`} className="block truncate font-semibold text-blue-700 hover:underline">
              {row.company_name}
            </Link>
            <div className="truncate text-xs text-gray-500">{row.hq_country ?? ""}</div>
          </div>
        </div>
      );
    case "ev": return num(row.ev_m_usd, 1);
    case "ev_revenue": return num(row.ev_revenue, 1, "x");
    case "ev_ebitda": return num(row.ev_ebitda, 1, "x");
    case "ev_ebit": return num(row.ev_ebit, 1, "x");
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
    case "sector": return text(row.primary_sectors?.map((s) => s.name).join(", "));
    case "ownership": return text(row.ownership);
    case "hq_city": return text(row.hq_city);
    case "hq_country": return text(row.hq_country);
    case "deal_type": return text(row.deal_type);
    case "deal_status": return text(row.deal_status);
    case "revenue": return num(row.revenue_m_usd, 1);
    case "ebitda": return num(row.ebitda_m_usd, 1);
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
      case "ev": return row.ev_m_usd;
      case "ev_revenue": return row.ev_revenue;
      case "ev_ebitda": return row.ev_ebitda;
      case "ev_ebit": return row.ev_ebit;
      case "deal_date": return row.deal_date;
      case "acquirer_investor": return row.acquirers?.map((a) => a.name).join("; ");
      case "corporate_events": return row.corporate_event?.name;
      case "sector": return row.primary_sectors?.map((s) => s.name).join("; ");
      case "ownership": return row.ownership;
      case "hq_city": return row.hq_city;
      case "hq_country": return row.hq_country;
      case "deal_type": return row.deal_type;
      case "deal_status": return row.deal_status;
      case "revenue": return row.revenue_m_usd;
      case "ebitda": return row.ebitda_m_usd;
      case "rev_growth": return row.revenue_growth_pc;
      case "ebitda_margin": return row.ebitda_margin_pc;
      case "rule_of_40": return row.rule_of_40;
      default: return "";
    }
  })();
  return v == null ? "" : (v as string | number);
}
