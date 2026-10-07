import type {
  CompanyColumnCategory,
  CompanyColumnMeta,
} from "@/components/companies/companiesColumnCategories";

const col = (
  id: string,
  label: string,
  type: CompanyColumnMeta["type"],
  extra: Partial<CompanyColumnMeta> = {}
): CompanyColumnMeta => ({
  id,
  columnKey: id,
  label,
  type,
  defaultVisible: false,
  ...extra,
});

/** 17 columns: 8 visible by default (Company, Primary sector(s) + 6 Default), 9 hidden. All backed by GET /transaction_comps. */
export const TRANSACTION_COMPS_COLUMN_CATEGORIES: CompanyColumnCategory[] = [
  {
    id: "identity",
    name: "Identity",
    columns: [
      col("company", "Company", "text", { locked: true, defaultVisible: true }),
      col("sector", "Primary sector(s)", "text", { defaultVisible: true }),
    ],
  },
  {
    id: "default",
    name: "Default",
    columns: [
      col("ev", "EV ($m)", "currency", { defaultVisible: true }),
      col("ev_revenue", "EV / Revenue", "number", { defaultVisible: true }),
      col("ev_ebitda", "EV / EBITDA", "number", { defaultVisible: true }),
      col("deal_date", "Deal date", "date", { defaultVisible: true }),
      col("acquirer_investor", "Acquirer / investor", "text", { defaultVisible: true }),
      col("corporate_events", "Related Corporate Event", "text", { defaultVisible: true }),
    ],
  },
  {
    id: "overview",
    name: "Overview",
    columns: [
      col("ownership", "Acquirer type", "text"),
      col("hq_city", "HQ city", "text"),
      col("hq_country", "HQ country", "text"),
    ],
  },
  {
    id: "deal_details",
    name: "Deal details",
    columns: [
      col("deal_type", "Deal type", "text"),
    ],
  },
  {
    id: "financial_metrics",
    name: "Financial metrics",
    columns: [
      col("revenue", "Revenue ($m)", "currency"),
      col("ebitda", "EBITDA ($m)", "currency"),
      col("rev_growth", "Revenue growth", "percent"),
      col("ebitda_margin", "EBITDA margin", "percent"),
      col("rule_of_40", "Rule of 40", "number"),
    ],
  },
];

export const ALL_TRANSACTION_COMPS_COLUMN_META: CompanyColumnMeta[] =
  TRANSACTION_COMPS_COLUMN_CATEGORIES.flatMap((c) => c.columns);

export const ALL_TRANSACTION_COMPS_COLUMN_KEYS = ALL_TRANSACTION_COMPS_COLUMN_META.map(
  (c) => c.columnKey
);

export const DEFAULT_TRANSACTION_COMPS_COLUMN_KEYS: string[] =
  ALL_TRANSACTION_COMPS_COLUMN_META.filter((c) => c.defaultVisible).map(
    (c) => c.columnKey
  );

export const FROZEN_TRANSACTION_COMPS_COLUMN_KEYS = ["company"];

export const TRANSACTION_COMPS_COLUMNS_STORAGE_KEY =
  "asymmetrix_transaction_comps_columns_v3";

/** Drops unknown keys, pins the frozen column first, falls back to defaults. */
export function normalizeTransactionCompsColumnKeys(keys: string[]): string[] {
  const valid = new Set(ALL_TRANSACTION_COMPS_COLUMN_KEYS);
  const out = [...FROZEN_TRANSACTION_COMPS_COLUMN_KEYS];
  for (const k of keys) {
    if (valid.has(k) && !out.includes(k)) out.push(k);
  }
  return out.length > 1 ? out : [...DEFAULT_TRANSACTION_COMPS_COLUMN_KEYS];
}

export function transactionCompsKeysToVisibility(
  keys: string[]
): Record<string, boolean> {
  const visible = new Set(keys);
  const out: Record<string, boolean> = {};
  for (const c of ALL_TRANSACTION_COMPS_COLUMN_META) {
    out[c.id] = c.locked ? true : visible.has(c.columnKey);
  }
  return out;
}

export function transactionCompsVisibilityToKeys(
  visible: Record<string, boolean>,
  previousOrder: string[] = []
): string[] {
  const on = new Set(
    ALL_TRANSACTION_COMPS_COLUMN_META.filter((c) => visible[c.id]).map(
      (c) => c.columnKey
    )
  );
  const ordered = previousOrder.filter((k) => on.has(k));
  for (const k of ALL_TRANSACTION_COMPS_COLUMN_KEYS) {
    if (on.has(k) && !ordered.includes(k)) ordered.push(k);
  }
  return normalizeTransactionCompsColumnKeys(ordered);
}
