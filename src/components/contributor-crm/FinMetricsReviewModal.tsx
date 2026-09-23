"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/contributorCrm/auth";
import { RequestDocumentsSection } from "@/components/contributor-crm/RequestDocumentsSection";
import {
  getFinMetricsChangeRequest,
  patchChangeRequestReviewDecisions,
  submitFinMetricsPost,
  submitFinMetricsPatch,
  type FinMetricsChangeItem,
  type FinMetricsChangeRequest,
  type FinMetricsCompanyItem,
} from "@/lib/contributorCrm/api";

// ── Field label map ────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  EV: "Enterprise Value",
  NRR: "Net Revenue Retention (%)",
  ARR_m: "ARR (M)",
  ARR_pc: "ARR Growth (%)",
  EBIT_m: "EBIT (M)",
  EV_usd: "EV (USD)",
  GRR_pc: "Gross Revenue Retention (%)",
  Churn_pc: "Churn (%)",
  EBITDA_m: "EBITDA (M)",
  ARR_m_usd: "ARR USD (M)",
  EV_source: "EV Source",
  Revenue_m: "Revenue (M)",
  Upsell_pc: "Upsell (%)",
  fx_bucket: "FX Bucket",
  ARR_source: "ARR Source",
  EBIT_m_usd: "EBIT USD (M)",
  GRR_source: "GRR Source",
  NRR_source: "NRR Source",
  Rev_source: "Revenue Source",
  Rule_of_40: "Rule of 40",
  EBIT_source: "EBIT Source",
  EV_currency: "EV Currency",
  ARR_currency: "ARR Currency",
  Churn_Source: "Churn Source",
  EBITDA_m_usd: "EBITDA USD (M)",
  No_Employees: "Employees",
  Rev_Currency: "Revenue Currency",
  Rev_x_source: "Rev x Source",
  Cross_sell_pc: "Cross-Sell (%)",
  EBITDA_margin: "EBITDA Margin (%)",
  EBITDA_source: "EBITDA Source",
  EBIT_currency: "EBIT Currency",
  No_of_Clients: "Clients",
  Rev_Growth_PC: "Revenue Growth (%)",
  Revenue_m_usd: "Revenue USD (M)",
  Upsell_source: "Upsell Source",
  Financial_Year: "Financial Year",
  Rev_per_client: "Revenue per Client",
  EBITDA_currency: "EBITDA Currency",
  Data_entry_notes: "Data Entry Notes",
  Rev_expansion_pc: "Revenue Expansion (%)",
  Revenue_multiple: "Revenue Multiple",
  Cross_sell_source: "Cross-Sell Source",
  No_Clients_source: "Clients Source",
  Price_increase_pc: "Price Increase (%)",
  Rev_Growth_source: "Revenue Growth Source",
  Rule_of_40_source: "Rule of 40 Source",
  No_Employees_source: "Employees Source",
  EBITDA_margin_source: "EBITDA Margin Source",
  New_client_growth_pc: "New Client Growth (%)",
  Rev_expansion_source: "Revenue Expansion Source",
  Revenue_per_employee: "Revenue per Employee",
  Price_increase_source: "Price Increase Source",
  Rev_per_client_source: "Revenue per Client Source",
  FY_YE_Month_Dec_default: "FY Year-End Month",
  Rev_per_employee_source: "Revenue per Employee Source",
  New_Client_Growth_Source: "New Client Growth Source",
  year_value: "Year",
  currency: "Currency",
};

// Extra fields that must be reviewed for both POST and PATCH workflows.
// These are not part of PATCHABLE_FIN_METRICS_FIELDS but are critical for
// record creation and updates (e.g. currency → resolved to currency_id).
const EXTRA_FIELDS = ["currency"] as const;

// Keys that are internal metadata — never shown as diff rows
const SKIP_KEYS = new Set([
  "id",
  "new_company_id",
  "Created_by",
  "created_at",
  "years_id",
  "years_text",
  "Financial_Year",
]);

type DecisionState = "approve" | "reject" | undefined;

/** Contributor `*_range` keys on the change request → fin_metrics field keys shown here. */
const CONTRIBUTOR_RANGE_KEY_TO_VALUE_KEY: Record<string, string> = {
  Revenue_m_range: "Revenue_m",
  EBITDA_m_range: "EBITDA_m",
  EV_range: "EV",
  Revenue_multiple_range: "Revenue_multiple",
  Rev_Growth_PC_range: "Rev_Growth_PC",
  EBITDA_margin_range: "EBITDA_margin",
  Rule_of_40_range: "Rule_of_40",
  ARR_pc_range: "ARR_pc",
  ARR_m_range: "ARR_m",
  Churn_pc_range: "Churn_pc",
  GRR_pc_range: "GRR_pc",
  NRR_range: "NRR",
  New_client_growth_pc_range: "New_client_growth_pc",
  EBIT_m_range: "EBIT_m",
  No_of_Clients_range: "No_of_Clients",
  Rev_per_client_range: "Rev_per_client",
  No_Employees_range: "No_Employees",
  Revenue_per_employee_range: "Revenue_per_employee",
};

const PATCHABLE_FIN_METRICS_FIELDS = [
  // ── System / metadata (filtered from display via SKIP_KEYS) ──
  "financial_metrics_id",
  "new_company_id",
  "Created_by",
  "Financial_Year",
  "FY_YE_Month_Dec_default",

  // ── Core Metrics ─────────────────────────────────────────────
  "Rev_Currency",
  "Revenue_m",
  "Revenue_m_usd",
  "Rev_source",

  "EBITDA_currency",
  "EBITDA_m",
  "EBITDA_m_usd",
  "EBITDA_source",

  "EV_currency",
  "EV",
  "EV_usd",
  "EV_source",

  "Revenue_multiple",
  "Rev_x_source",

  "Rev_Growth_PC",
  "Rev_Growth_source",

  "EBITDA_margin",
  "EBITDA_margin_source",

  "Rule_of_40",
  "Rule_of_40_source",

  // ── Subscription Metrics ──────────────────────────────────────
  "ARR_pc",                   // Recurring Revenue %

  "ARR_currency",
  "ARR_m",
  "ARR_m_usd",
  "ARR_source",

  "Churn_pc",
  "Churn_Source",

  "GRR_pc",
  "GRR_source",

  "NRR",
  "NRR_source",

  "Upsell_pc",
  "Upsell_source",

  "Cross_sell_pc",
  "Cross_sell_source",

  "Price_increase_pc",
  "Price_increase_source",

  "Rev_expansion_pc",
  "Rev_expansion_source",

  "New_client_growth_pc",
  "New_Client_Growth_Source",

  // ── Other Metrics ─────────────────────────────────────────────
  "EBIT_currency",
  "EBIT_m",
  "EBIT_m_usd",
  "EBIT_source",

  "No_of_Clients",
  "No_Clients_source",

  "Rev_per_client",
  "Rev_per_client_source",

  "No_Employees",
  "No_Employees_source",

  "Revenue_per_employee",
  "Rev_per_employee_source",

  // ── Notes / misc ─────────────────────────────────────────────
  "Data_entry_notes",
  "fx_bucket",
] as const;


function humanizeKey(key: string): string {
  return (
    FIELD_LABELS[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatDate(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function toEditorValue(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

/** Extract a human-readable year label from an individual change item. */
function getChangeYearLabel(change: FinMetricsChangeItem): string {
  const n = change.new;
  // Prefer the explicit text label added by the backend
  if (n.years_text != null && String(n.years_text).trim() !== "") {
    return String(n.years_text).trim();
  }
  const v = n.year_value ?? n.Financial_Year;
  if (v != null && String(v).trim() !== "" && String(v).trim() !== "0") {
    return String(v).trim();
  }
  if (n.years_id != null) return String(n.years_id);
  return `#${change.id}`;
}

function getChangedFields(
  mergedOld: Record<string, unknown>,
  mergedNew: Record<string, unknown>
): string[] {
  const changedSet = new Set(
    Object.keys(mergedNew).filter((key) => {
      if (SKIP_KEYS.has(key)) return false;
      return String(mergedOld[key] ?? "") !== String(mergedNew[key] ?? "");
    })
  );
  return PATCHABLE_FIN_METRICS_FIELDS.filter((key) => changedSet.has(key));
}

/** Returns changed fields plus extras (e.g. currency) for both POST and PATCH. */
function getChangedFieldsForWorkflow(change: FinMetricsChangeItem): string[] {
  const base = getChangedFields(change.old, change.new);
  const extras = (EXTRA_FIELDS as readonly string[]).filter(
    (k) => change.new[k] != null && String(change.new[k]).trim() !== ""
  );
  return [...base, ...extras];
}

/** Patchable keys in review order when a contributor `*_range` changes but the scalar may be unchanged or absent. */
function getReviewerDisplayFieldKeys(change: FinMetricsChangeItem): string[] {
  const wf = getChangedFieldsForWorkflow(change);
  const set = new Set(wf);
  const patchable = PATCHABLE_FIN_METRICS_FIELDS as readonly string[];
  for (const [rangeKey, valueKey] of Object.entries(CONTRIBUTOR_RANGE_KEY_TO_VALUE_KEY)) {
    const rNew = change.new[rangeKey];
    if (rNew == null || String(rNew).trim() === "") continue;
    if (String(change.old[rangeKey] ?? "").trim() === String(rNew).trim()) continue;
    if (patchable.includes(valueKey)) set.add(valueKey);
  }
  return [
    ...patchable.filter((k) => set.has(k)),
    ...(EXTRA_FIELDS as readonly string[]).filter((k) => set.has(k)),
  ];
}

function getContributorSubmittedRange(change: FinMetricsChangeItem, valueKey: string): string | null {
  const rangeKey = Object.entries(CONTRIBUTOR_RANGE_KEY_TO_VALUE_KEY).find(
    ([, vk]) => vk === valueKey
  )?.[0];
  if (!rangeKey) return null;
  const raw = change.new[rangeKey];
  if (raw == null || String(raw).trim() === "") return null;
  return String(raw).trim();
}

function parseContributorRangeMidpoint(raw: string): number | null {
  const parts = raw
    .trim()
    .split(/\s*(?:-|–|—|to)\s*/i)
    .filter((p) => p.trim() !== "");
  if (parts.length !== 2) return null;
  const parseN = (tok: string) => {
    const t = tok.replace(/,/g, "").replace(/[$£€\s]/g, "").trim();
    const w = t.replace(/[×x%]$/gi, "").trim();
    const v = Number(w);
    return Number.isFinite(v) ? v : NaN;
  };
  const a = parseN(parts[0]);
  const b = parseN(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (a + b) / 2;
}

function formatMidpointForFinMetric(n: number): string {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 1e6) / 1e6;
  return String(rounded);
}

function getFinancialMetricsId(
  mergedOld: Record<string, unknown>,
  mergedNew: Record<string, unknown>
): number | null {
  const raw = mergedOld.id ?? mergedNew.id;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Choose submit API: POST (`/fin_metrics`) vs PATCH (`/fin_metrics_patch`).
 * Normalizes casing; if workflow is missing, infers from presence of fin metrics id on the change.
 */
function resolveFinMetricsReviewerWorkflow(change: FinMetricsChangeItem): "POST" | "PATCH" {
  const w = change.workflow;
  if (typeof w === "string") {
    const u = w.trim().toUpperCase();
    if (u === "POST") return "POST";
    if (u === "PATCH") return "PATCH";
  }
  return getFinancialMetricsId(change.old, change.new) == null ? "POST" : "PATCH";
}

const CONTRIBUTED_APPROVED_DISPLAY = "Contributed & Approved";

function finMetricsChangeStatusRaw(change: FinMetricsChangeItem): string {
  const s =
    change.status ??
    change.contributor_status ??
    change.change_status ??
    "";
  return String(s).trim();
}

/** True when the API marks this row as finalized (contributor submitted + approval complete). */
function isFinMetricsChangeContributedApproved(change: FinMetricsChangeItem): boolean {
  const normalized = finMetricsChangeStatusRaw(change).toLowerCase().replace("&amp;", "&");
  if (!normalized) return false;
  return (
    normalized.includes("contributed") &&
    (normalized.includes("approved") || normalized.includes("accepted"))
  );
}

/** Second line under the year label in the selector chips. */
function finMetricsYearChipSecondLine(change: FinMetricsChangeItem): string {
  const currencyRaw = change.new.currency;
  const currency =
    currencyRaw != null && String(currencyRaw).trim() !== ""
      ? String(currencyRaw)
      : null;
  const tail = currency ? ` · ${currency}` : "";
  if (isFinMetricsChangeContributedApproved(change)) {
    return `${CONTRIBUTED_APPROVED_DISPLAY}${tail}`;
  }
  const kind = resolveFinMetricsReviewerWorkflow(change) === "POST" ? "New" : "Update";
  return `${kind}${tail}`;
}


/**
 * POST workflow: builds the `new_data` object to send to /fin_metrics.
 * Starts from the submitted `change.new`, then applies reviewer decisions:
 * - approved fields use the (possibly edited) reviewer value
 * - rejected fields are removed from the payload
 */
function buildFinMetricsNewData({
  change,
  changedFields,
  decisions,
  editedValues,
  currencyOptions,
}: {
  change: FinMetricsChangeItem;
  changedFields: string[];
  decisions: Record<string, DecisionState>;
  editedValues: Record<string, string>;
  currencyOptions: Array<{ value: string; label: string; id: number }>;
}): Record<string, unknown> {
  const result: Record<string, unknown> = { ...change.new };

  for (const key of changedFields) {
    const decision = decisions[key];
    if (decision === "reject") {
      delete result[key];
    } else if (decision === "approve") {
      result[key] = editedValues[key];
    }
  }

  // Resolve currency text (e.g. "USD") → numeric currency_id using the stored id.
  if (result.currency != null) {
    const raw = String(result.currency);
    const match = currencyOptions.find((o) => o.value === raw || o.label === raw);
    result.currency_id = match ? match.id : (Number.isNaN(Number(raw)) ? raw : Number(raw));
    delete result.currency;
  }

  for (const [rangeKey, valueKey] of Object.entries(CONTRIBUTOR_RANGE_KEY_TO_VALUE_KEY)) {
    if (!changedFields.includes(valueKey)) continue;
    const d = decisions[valueKey];
    if (d === "reject") {
      delete result[rangeKey];
      continue;
    }
    if (d === "approve") {
      const fromContributor = change.new[rangeKey];
      if (fromContributor != null && String(fromContributor).trim() !== "") {
        result[rangeKey] = fromContributor;
      }
    }
  }

  return result;
}

/** Contributor field snapshot when reviewer rejects it — same keys as API `change.new`, annotated. */
export type FinMetricsRejectedFieldEnvelope = {
  value: unknown;
  status: "rejected";
};

/**
 * Builds a JSON-safe map of rejected contributor fields: same field keys as in `change.new`,
 * each value shaped as `{ value: <exact contributor value from API>, status: 'rejected' }`.
 * When a scalar metric is rejected, its paired `*_range` key from CONTRIBUTOR_RANGE_KEY_TO_VALUE_KEY
 * is included too when present on `change.new`.
 */
export function buildFinMetricsRejectedFieldsPayload({
  change,
  changedFields,
  decisions,
}: {
  change: FinMetricsChangeItem;
  changedFields: string[];
  decisions: Record<string, DecisionState>;
}): Record<string, FinMetricsRejectedFieldEnvelope> {
  const result: Record<string, FinMetricsRejectedFieldEnvelope> = {};

  for (const key of changedFields) {
    if (decisions[key] !== "reject") continue;
    result[key] = { value: change.new[key], status: "rejected" };
  }

  for (const [rangeKey, valueKey] of Object.entries(CONTRIBUTOR_RANGE_KEY_TO_VALUE_KEY)) {
    if (!changedFields.includes(valueKey)) continue;
    if (decisions[valueKey] !== "reject") continue;
    const rawRange = change.new[rangeKey];
    if (rawRange != null && String(rawRange).trim() !== "") {
      result[rangeKey] = { value: rawRange, status: "rejected" };
    }
  }

  return result;
}

function extractRejectedKeysFromReviewDecisions(rd: unknown): Set<string> {
  if (!rd || typeof rd !== "object") return new Set();
  const out = new Set<string>();
  for (const [k, raw] of Object.entries(rd as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const status = String((raw as Record<string, unknown>).status ?? "").toLowerCase();
    if (status === "rejected") out.add(k);
  }
  return out;
}

/** Map contributor range keys in review_decisions onto the scalar field keys shown in the modal. */
function expandReviewRejectedKeysForDisplay(rawKeys: Set<string>): Set<string> {
  const out = new Set(rawKeys);
  for (const [rangeKey, valueKey] of Object.entries(CONTRIBUTOR_RANGE_KEY_TO_VALUE_KEY)) {
    if (rawKeys.has(rangeKey)) out.add(valueKey);
  }
  return out;
}

/** Baseline proposed value recorded with a rejected review_decisions entry (fallback: contributor `new`). */
function getReviewDecisionRejectedBaselineValue(
  change: FinMetricsChangeItem,
  fieldKey: string
): unknown {
  const rd = change.review_decisions as Record<string, unknown> | undefined;
  const readRejectedValueAt = (objKey: string): unknown => {
    const raw = rd?.[objKey];
    if (!raw || typeof raw !== "object") return undefined;
    const rec = raw as Record<string, unknown>;
    const status = String(rec.status ?? "").toLowerCase();
    if (status !== "rejected") return undefined;
    return rec.value;
  };
  const direct = readRejectedValueAt(fieldKey);
  if (direct !== undefined) return direct;
  const rangeKey = Object.entries(CONTRIBUTOR_RANGE_KEY_TO_VALUE_KEY).find(
    ([, vk]) => vk === fieldKey
  )?.[0];
  if (rangeKey) {
    const fromRange = readRejectedValueAt(rangeKey);
    if (fromRange !== undefined) return fromRange;
  }
  return change.new[fieldKey];
}

/** When API returns multiple change rows, prefer one with saved review_decisions so UI matches server state. */
function pickInitialFinMetricsChangeId(changes: FinMetricsChangeItem[]): number | null {
  if (changes.length === 0) return null;

  const withPersistedRejections = changes.find(
    (c) => extractRejectedKeysFromReviewDecisions(c.review_decisions).size > 0
  );
  if (withPersistedRejections) return withPersistedRejections.id;

  const withReviewDecisions = changes.find((c) => {
    const rd = c.review_decisions;
    return rd != null && typeof rd === "object" && Object.keys(rd as object).length > 0;
  });
  if (withReviewDecisions) return withReviewDecisions.id;

  return changes[0].id;
}

// ── Single field diff row ──────────────────────────────────────────────────
function FieldDiffRow({
  fieldKey,
  oldValue,
  newValue,
  decision,
  editedValue,
  onDecide,
  onEditedValueChange,
  interactionDisabled,
  selectOptions,
  contributorRange,
  onSelectRangeMidpoint,
  serverRejectedHighlight,
  serverRejectedBaseline,
}: {
  fieldKey: string;
  oldValue: unknown;
  newValue: unknown;
  decision: DecisionState;
  editedValue: string;
  onDecide: (key: string, value: DecisionState) => void;
  onEditedValueChange: (key: string, value: string) => void;
  /** Accept / reject / edit / clear are hidden when the change is finalized or modal is view-only */
  interactionDisabled?: boolean;
  /** When provided, edit mode renders a <select> instead of <input>. */
  selectOptions?: Array<{ value: string; label: string }>;
  contributorRange?: { raw: string; midpointLabel: string } | null;
  onSelectRangeMidpoint?: () => void;
  /** Row was rejected in persisted `review_decisions` — highlight and gate Accept until edited. */
  serverRejectedHighlight?: boolean;
  /** String compare baseline from `review_decisions[].value` (same encoding as editedValues). */
  serverRejectedBaseline?: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (interactionDisabled) setIsEditing(false);
  }, [interactionDisabled]);

  const label = humanizeKey(fieldKey);
  const oldStr = formatVal(oldValue);
  const hasEdit = editedValue !== toEditorValue(newValue);
  const locked = Boolean(interactionDisabled);
  const baselineLocked =
    Boolean(serverRejectedHighlight) &&
    serverRejectedBaseline != null &&
    editedValue === serverRejectedBaseline;

  const cardSurfaceClass = serverRejectedHighlight
    ? "border-rose-300 bg-rose-50/60 shadow-sm ring-1 ring-rose-200/90"
    : "border-gray-200 bg-white shadow-sm";

  return (
    <div className={`rounded-xl border p-4 ${cardSurfaceClass}`}>
      {serverRejectedHighlight && baselineLocked && !locked && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-100/80 px-3 py-2 text-[11px] font-medium text-rose-950">
          Rejected in review — edit the proposed value to enable Accept (and Reject/Clear).
        </div>
      )}
      <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {!locked &&
            (!baselineLocked ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle off when clicking the already-selected choice (same as Clear).
                    onDecide(fieldKey, decision === "approve" ? undefined : "approve");
                  }}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    decision === "approve"
                      ? "bg-emerald-600 text-white"
                      : "border border-emerald-500 bg-white text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecide(fieldKey, decision === "reject" ? undefined : "reject");
                  }}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    decision === "reject"
                      ? "bg-rose-600 text-white"
                      : "border border-rose-400 bg-white text-rose-500 hover:bg-rose-50"
                  }`}
                >
                  Reject
                </button>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    ✏️ Edit
                  </button>
                )}
                {decision && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDecide(fieldKey, undefined);
                    }}
                    className="cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Clear
                  </button>
                )}
              </>
            ) : !isEditing ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="cursor-pointer rounded-md border border-gray-400 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  ✏️ Edit
                </button>
              ) : null)}
        </div>
      </div>

      {contributorRange && (
        <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs text-indigo-950">
          <div className="font-semibold text-indigo-900">Contributor range (historical record)</div>
          <div className="mt-1 text-indigo-900">
            <span className="text-indigo-600">Low–high: </span>
            <span className="font-mono font-medium">{contributorRange.raw}</span>
          </div>
          {contributorRange.midpointLabel ? (
            <>
              <div className="mt-1 text-indigo-900">
                <span className="text-indigo-600">Midpoint: </span>
                <span className="font-mono font-semibold">{contributorRange.midpointLabel}</span>
              </div>
              {!locked && onSelectRangeMidpoint && !baselineLocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRangeMidpoint();
                  }}
                  className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  Select range midpoint
                </button>
              )}
            </>
          ) : (
            <p className="mt-1 text-amber-900">
              Range format not recognized; enter the value for the Proposed column manually.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-gray-400">Current</div>
          <span className="text-sm text-gray-500">{oldStr}</span>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-blue-500">
            <span>Proposed</span>
            {isEditing && !locked && (
              <span className="normal-case text-gray-400">editing</span>
            )}
          </div>
          {isEditing && !locked ? (
            <div className="space-y-2">
              {selectOptions ? (
                <select
                  autoFocus
                  value={editedValue}
                  onChange={(e) => onEditedValueChange(fieldKey, e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400"
                >
                  <option value="">Select…</option>
                  {selectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  autoFocus
                  value={editedValue}
                  onChange={(e) => onEditedValueChange(fieldKey, e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400"
                />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(false);
                  }}
                  className="rounded-md bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-500"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditedValueChange(fieldKey, toEditorValue(newValue));
                    setIsEditing(false);
                  }}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="text-sm text-gray-800">
                {formatVal(editedValue.trim() === "" ? null : editedValue)}
              </span>
              {!locked && hasEdit && (
                <div className="mt-1 text-[10px] italic text-[rgba(59,130,246,0.8)]">
                  Modified by reviewer
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!locked &&
        decision &&
        !(serverRejectedHighlight && baselineLocked && decision === "reject") && (
        <div className="mt-2 text-[11px] uppercase tracking-wider">
          {decision === "approve" ? (
            <span className="text-emerald-600">Marked accept</span>
          ) : (
            <span className="text-rose-600">Marked reject</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Workflow badge ─────────────────────────────────────────────────────────
function WorkflowBadge({ isNew }: { isNew: boolean }) {
  if (isNew) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blue-600">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        New Submission
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(59,130,246,0.5)] bg-[rgba(59,130,246,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(59,130,246,1)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[rgba(59,130,246,1)]" />
      Change Request
    </span>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────
type FinMetricsReviewModalProps = {
  row: FinMetricsCompanyItem;
  onClose: () => void;
  onApplied?: () => void;
  readOnly?: boolean;
};

function companyName(row: FinMetricsCompanyItem): string {
  return typeof row.company_name === "number"
    ? String(row.company_name)
    : row.company_name;
}

export function FinMetricsReviewModal({
  row,
  onClose,
  onApplied,
  readOnly = false,
}: FinMetricsReviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinMetricsChangeRequest | null>(null);
  const [selectedChangeId, setSelectedChangeId] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ value: string; label: string; id: number }>>([]);

  useEffect(() => {
    const token = authService.getAuthToken();
    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getFinMetricsChangeRequest(token, row.company_id)
      .then((res) => {
        setData(res);
        if (res.changes.length > 0) {
          const initialId = pickInitialFinMetricsChangeId(res.changes);
          if (initialId != null) setSelectedChangeId(initialId);
        }
      })
      .catch((err) => {
        setError((err as Error).message || "Failed to load financial metrics changes");
      })
      .finally(() => setLoading(false));
  }, [row.company_id]);

  useEffect(() => {
    fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8Bv5PK4I/get_currency")
      .then((r) => r.json())
      .then((list: Array<{ id: number; Currency: string }>) => {
        // value = currency text (e.g. "USD") so editedValues stays as readable text.
        // id is stored separately for build-time resolution to numeric currency_id.
        setCurrencyOptions(list.map((c) => ({ value: c.Currency, label: c.Currency, id: c.id })));
      })
      .catch(() => {});
  }, []);

  // Derive the currently selected change item
  const selectedChange = data?.changes.find((c) => c.id === selectedChangeId) ?? null;
  const reviewDecisionsFingerprint =
    selectedChange?.review_decisions != null && typeof selectedChange.review_decisions === "object"
      ? JSON.stringify(selectedChange.review_decisions)
      : "";
  const selectedChangeFinalized = selectedChange
    ? isFinMetricsChangeContributedApproved(selectedChange)
    : false;
  const reviewActionsLocked = readOnly || selectedChangeFinalized;

  // Reset decisions + edited values whenever the selected change switches (or persisted review_decisions load)
  useEffect(() => {
    if (!selectedChange || !data) {
      setDecisions({});
      setEditedValues({});
      return;
    }

    const keys = getReviewerDisplayFieldKeys(selectedChange);
    const nextEditedValues = Object.fromEntries(
      keys.map((key) => [key, toEditorValue(selectedChange.new[key])])
    );

    const rawRejected = extractRejectedKeysFromReviewDecisions(selectedChange.review_decisions);
    const expandedRejected = expandReviewRejectedKeysForDisplay(rawRejected);
    const initialDecisions: Record<string, DecisionState> = {};
    for (const key of keys) {
      if (expandedRejected.has(key)) initialDecisions[key] = "reject";
    }

    setEditedValues(nextEditedValues);
    setDecisions(initialDecisions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChangeId, reviewDecisionsFingerprint]);

  const changedFields = selectedChange ? getReviewerDisplayFieldKeys(selectedChange) : [];
  const rawRejectedKeysFromApi = selectedChange
    ? extractRejectedKeysFromReviewDecisions(selectedChange.review_decisions)
    : new Set<string>();
  const serverRejectedFieldKeys = expandReviewRejectedKeysForDisplay(rawRejectedKeysFromApi);
  const reviewerWorkflow = selectedChange
    ? resolveFinMetricsReviewerWorkflow(selectedChange)
    : null;
  const isNewYearRequest = reviewerWorkflow === "POST";
  const acceptedCount = changedFields.filter((key) => decisions[key] === "approve").length;
  const rejectedCount = changedFields.filter((key) => decisions[key] === "reject").length;

  const decided = Object.values(decisions).filter(Boolean).length;
  const total = changedFields.length;
  const canSubmit =
    !loading &&
    !error &&
    total > 0 &&
    !submitting &&
    !selectedChangeFinalized &&
    (isNewYearRequest ? decided >= 1 : decided === total);

  const handleApplyReview = async () => {
    if (!selectedChange) return;
    if (isFinMetricsChangeContributedApproved(selectedChange)) {
      toast.error(`${CONTRIBUTED_APPROVED_DISPLAY}: this submission cannot be modified.`);
      return;
    }
    if (!isNewYearRequest && decided !== total) {
      toast.error("Review every changed field before applying");
      return;
    }
    if (isNewYearRequest && decided < 1) {
      toast.error("Accept or reject at least one changed field before submitting");
      return;
    }

    const token = authService.getAuthToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    const currentUser = authService.getUser();

    setSubmitting(true);
    try {
      const applyWorkflow = resolveFinMetricsReviewerWorkflow(selectedChange);

      const reviewDecisionsMap = buildFinMetricsRejectedFieldsPayload({
        change: selectedChange,
        changedFields,
        decisions,
      });
      if (Object.keys(reviewDecisionsMap).length > 0) {
        const newCompanyId = data?.new_company_id ?? row.company_id;
        await patchChangeRequestReviewDecisions(token, selectedChange.id, {
          change_request_id: selectedChange.id,
          entity_type: "",
          submitted_by: selectedChange.submitted_by,
          old: selectedChange.old,
          new: selectedChange.new,
          reviewed_by: currentUser?.id ?? 0,
          new_company_id: newCompanyId,
          documents: selectedChange.documents ?? [],
          workflow:
            typeof selectedChange.workflow === "string"
              ? selectedChange.workflow
              : selectedChange.workflow != null
                ? String(selectedChange.workflow)
                : "",
          status: "Not Contributed",
          review_decisions: reviewDecisionsMap as Record<string, unknown>,
        });
      }

      const newData = buildFinMetricsNewData({
        change: selectedChange,
        changedFields,
        decisions,
        editedValues,
        currencyOptions,
      });
      newData.change_request_id = selectedChange.id;

      if (applyWorkflow === "POST") {
        if (acceptedCount > 0) {
          if (currentUser) newData.user_id = currentUser.id;
          await submitFinMetricsPost(token, newData);
          toast.success("New financial year submitted");
        }
      } else if (acceptedCount > 0) {
        const financialMetricsId = getFinancialMetricsId(selectedChange.old, selectedChange.new);
        if (financialMetricsId == null) {
          throw new Error("Unable to identify the financial metrics record for PATCH");
        }
        newData.id = financialMetricsId;
        await submitFinMetricsPatch(token, newData, selectedChange.id);
        toast.success("Financial metrics updated");
      }

      if (acceptedCount === 0) {
        toast.success(
          Object.keys(reviewDecisionsMap).length > 0
            ? applyWorkflow === "POST"
              ? "Rejections recorded — no financial metrics row was created."
              : "Rejections recorded — financial metrics unchanged."
            : "No accepted fields — financial metrics unchanged."
        );
      }

      // Navigate to the next pending change rather than closing the modal immediately.
      // Only close when every change in this request group has been processed.
      const remaining = (data?.changes ?? []).filter((c) => c.id !== selectedChange.id);
      if (remaining.length > 0) {
        setData((prev) => (prev ? { ...prev, changes: remaining } : null));
        const nextId = pickInitialFinMetricsChangeId(remaining);
        setSelectedChangeId(nextId);
      } else {
        onApplied?.();
        onClose();
      }
    } catch (err) {
      toast.error((err as Error).message || "Failed to apply financial metrics review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-widest text-gray-400">
              Financial Metrics Review
              {readOnly && (
                <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-gray-400">
                  View only
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {companyName(row)}
            </h2>
            {data && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <WorkflowBadge isNew={isNewYearRequest} />
                <span className="text-xs text-gray-400">
                  {data.request_count} request{data.request_count !== 1 ? "s" : ""}
                </span>
                {selectedChange &&
                  data.changes.length === 1 &&
                  isFinMetricsChangeContributedApproved(selectedChange) && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        {CONTRIBUTED_APPROVED_DISPLAY}
                      </span>
                    </>
                  )}
                {selectedChange && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">
                      by {selectedChange.submitted_by}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(selectedChange.submitted_at)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {/* Year / request selector */}
        {!loading && !error && data && data.changes.length > 1 && (
          <div className="mb-5">
            <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-400">
              Select year to review
            </div>
            <div className="flex flex-wrap gap-2">
              {data.changes.map((change) => {
                const isSelected = selectedChangeId === change.id;
                return (
                  <button
                    key={change.id}
                    type="button"
                    onClick={() => setSelectedChangeId(change.id)}
                    className={`flex flex-col items-start rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>{getChangeYearLabel(change)}</span>
                    <span
                      className={`text-xs font-normal ${isSelected ? "text-blue-100" : "text-gray-400"}`}
                    >
                      {finMetricsYearChipSecondLine(change)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents for selected change */}
        {selectedChange?.documents && selectedChange.documents.length > 0 && (
          <div className="mb-5">
            <RequestDocumentsSection documents={selectedChange.documents} />
          </div>
        )}

        {/* Progress bar */}
        {!reviewActionsLocked && !loading && !error && total > 0 && (
          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-gray-400">
              <span>Review progress</span>
              <span>{decided} / {total} reviewed</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all"
                style={{ width: total > 0 ? `${(decided / total) * 100}%` : "0%" }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-400">
            Loading financial metrics changes…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : !selectedChange || changedFields.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-400">
            No pending field changes found.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedChangeFinalized && !readOnly && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <span className="font-medium">{CONTRIBUTED_APPROVED_DISPLAY}.</span>{" "}
                This submission is complete — field actions and apply are disabled.
              </div>
            )}
            <div className="mb-2 flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(59,130,246,1)]">
                Proposed Changes
              </span>
              <span className="text-[11px] text-gray-400">
                {changedFields.length} field{changedFields.length !== 1 ? "s" : ""} changed
              </span>
            </div>
            {changedFields.map((key) => {
              const rangeRaw = getContributorSubmittedRange(selectedChange, key);
              const midpointN =
                rangeRaw != null ? parseContributorRangeMidpoint(rangeRaw) : null;
              const contributorRange =
                rangeRaw != null
                  ? midpointN != null
                    ? { raw: rangeRaw, midpointLabel: formatMidpointForFinMetric(midpointN) }
                    : { raw: rangeRaw, midpointLabel: "" }
                  : null;
              return (
                <FieldDiffRow
                  key={key}
                  fieldKey={key}
                  oldValue={selectedChange.old[key]}
                  newValue={selectedChange.new[key]}
                  decision={reviewActionsLocked ? undefined : decisions[key]}
                  editedValue={editedValues[key] ?? toEditorValue(selectedChange.new[key])}
                  onDecide={reviewActionsLocked ? () => {} : (k, v) =>
                    setDecisions((prev) => ({ ...prev, [k]: v }))
                  }
                  onEditedValueChange={reviewActionsLocked ? () => {} : (k, value) =>
                    setEditedValues((prev) => ({ ...prev, [k]: value }))
                  }
                  interactionDisabled={reviewActionsLocked || submitting}
                  serverRejectedHighlight={serverRejectedFieldKeys.has(key)}
                  serverRejectedBaseline={
                    serverRejectedFieldKeys.has(key)
                      ? toEditorValue(getReviewDecisionRejectedBaselineValue(selectedChange, key))
                      : null
                  }
                  selectOptions={key === "currency" ? currencyOptions : undefined}
                  contributorRange={contributorRange}
                  onSelectRangeMidpoint={
                    contributorRange?.midpointLabel
                      ? () => {
                          setEditedValues((prev) => ({
                            ...prev,
                            [key]: contributorRange.midpointLabel,
                          }));
                          toast.success(
                            "Proposed value set to contributor range midpoint. Accept to apply this single value to financial metrics."
                          );
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}

        {!readOnly && !loading && !error && total > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="text-xs text-gray-400">
              {selectedChangeFinalized
                ? `${CONTRIBUTED_APPROVED_DISPLAY}. No further action is required.`
                : isNewYearRequest
                ? decided === 0
                  ? "Accept or reject at least one changed field to submit."
                  : `${acceptedCount} accepted · ${rejectedCount} rejected${
                      decided < total
                        ? ` · ${total - decided} not reviewed (those stay as proposed in the submission)`
                        : ""
                    }`
                : decided === total
                  ? "All changed fields reviewed. Ready to apply."
                  : `Review ${total - decided} more field${total - decided !== 1 ? "s" : ""} before applying.`}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              {!selectedChangeFinalized && (
                <button
                  type="button"
                  onClick={() => void handleApplyReview()}
                  disabled={!canSubmit}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? isNewYearRequest
                      ? "Submitting..."
                      : "Applying..."
                    : isNewYearRequest
                      ? "Submit review"
                      : "Apply Review"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
