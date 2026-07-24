"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authService } from "@/lib/contributorCrm/auth";
import { RequestDocumentsSection } from "@/components/contributor-crm/RequestDocumentsSection";
import {
  getChangeRequestById,
  getCompanyChangeRequestSummaries,
  getPrimarySectors,
  getSecondarySectors,
  getBusinessFocuses,
  getOwnershipTypes,
  applyCompanyChangeRequest,
  patchChangeRequestReviewDecisions,
  type CompanyChangeRequestSummary,
  type ChangeRequestItem,
  type FinMetricsCompanyItem,
} from "@/lib/contributorCrm/api";

type LookupOption = { value: string; label: string; id?: number };

type ChangeReviewModalProps = {
  row: FinMetricsCompanyItem;
  onClose: () => void;
  readOnly?: boolean;
  onApplied?: () => void;
};

type DiffEntry = {
  key: string;
  path: string[];
  oldValue: unknown;
  newValue: unknown;
};

type DecisionState = "approve" | "reject" | undefined;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type DiffListPayload = {
  added: unknown[];
  removed: unknown[];
};

// ── Lookup context ─────────────────────────────────────────────────────────
type LookupData = {
  primarySectorOptions: LookupOption[];
  secondarySectorOptions: LookupOption[];
  ownershipOptions: LookupOption[];
  businessFocusOptions: LookupOption[];
  yearOptions: LookupOption[];
  counterpartyRoleOptions: LookupOption[];
  currencyOptions: LookupOption[];
  jobTitleOptions: LookupOption[];
  locationOptions: LookupOption[];
  companyIndividuals: ReviewManagementPerson[];
  transactionStatusOptions: LookupOption[];
};

const YEAR_OPTIONS: LookupOption[] = Array.from(
  { length: new Date().getFullYear() - 1799 },
  (_, i) => {
    const y = String(new Date().getFullYear() - i);
    return { value: y, label: y };
  }
);

const DEAL_TYPE_OPTIONS: LookupOption[] = [
  "Acquisition","Sale","IPO","MBO","Investment","Strategic Review","Divestment",
  "Restructuring","Dual track","Closing","Grant","Debt financing","Bankruptcy",
  "Reorganisation","Employee tender offer","Rebrand","Partnership",
].map((v) => ({ value: v, label: v }));

const DEAL_STATUS_OPTIONS: LookupOption[] = [
  "Completed","In Market","Not yet launched","Strategic Review","Deal Prep",
  "In Exclusivity","Cancelled / Failed",
].map((v) => ({ value: v, label: v }));

const FUNDING_STAGE_OPTIONS: LookupOption[] = [
  "Pre-seed","Seed","Series A","Series B","Series C","Series D","Series E",
  "Series F","Credit facility","Buyout","Closing","Growth","Grant","Debt",
  "Take Private","Series G",
].map((v) => ({ value: v, label: v }));

const INDIVIDUAL_STATUS_OPTIONS: LookupOption[] = [
  { value: "Current", label: "Current" },
  { value: "Past", label: "Past" },
];

const TRANSACTION_STATUS_OPTIONS: LookupOption[] = [
  "Rumoured in Market",
  "Transaction anticipated within 18 months",
  "Reported in Market",
].map((v) => ({ value: v, label: v }));

const LookupContext = createContext<LookupData>({
  primarySectorOptions: [],
  secondarySectorOptions: [],
  ownershipOptions: [],
  businessFocusOptions: [],
  yearOptions: YEAR_OPTIONS,
  counterpartyRoleOptions: [],
  currencyOptions: [],
  jobTitleOptions: [],
  locationOptions: [],
  companyIndividuals: [],
  transactionStatusOptions: TRANSACTION_STATUS_OPTIONS,
});

function useLookup() {
  return useContext(LookupContext);
}

function formatDate(ms: number | null | undefined): string {
  if (ms == null) return "Unknown date";
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRequestOldPayload(request: ChangeRequestItem): Record<string, unknown> {
  if (isPlainObject(request.old)) return request.old;
  if (isPlainObject(request.merged_old)) return request.merged_old;
  return {};
}

function getRequestNewPayload(request: ChangeRequestItem): Record<string, unknown> {
  if (isPlainObject(request.new)) return request.new;
  if (isPlainObject(request.merged_new)) return request.merged_new;
  return {};
}

function getRequestSubmittedBy(
  request: Pick<ChangeRequestItem, "submitted_by"> | Pick<CompanyChangeRequestSummary, "submitted_by">
): string {
  if (Array.isArray(request.submitted_by)) {
    return request.submitted_by.filter(Boolean).join(", ");
  }
  return request.submitted_by || "Unknown";
}

function isReviewableRequestStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return true;
  return normalized !== "approved" && normalized !== "rejected";
}

function isAlreadyReviewedStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized.includes("approved") || normalized.includes("rejected");
}

function humanizeSegment(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== typeof right) return false;
  if (Array.isArray(left) || isPlainObject(left)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
}

const SECTION_LABELS: Record<string, string> = {
  investors: "Investors",
  peers_competitors: "Peers & Competitors",
  potential_acquirers: "Potential Acquirers",
  acquisition_targets: "Acquisition Targets",
  subsidiaries: "Subsidiaries",
  management_people: "Management",
  corporate_events: "Corporate Events",
  primary_sectors: "Primary Sectors",
  secondary_sectors: "Secondary Sectors",
  sectors: "Sectors",
  counterparties: "Counterparties",
  individuals: "Individuals",
  roles: "Roles",
};

const GROUPED_SEGMENTS = new Set(Object.keys(SECTION_LABELS));

function getArrayItemKey(item: unknown, index: number): string {
  const displayValue = getDisplayValue(item);
  if (isPlainObject(displayValue)) {
    const candidates = [
      displayValue.entity_id,
      displayValue.company_id,
      displayValue.name,
      displayValue.title,
      displayValue.company_name,
      displayValue.role_type,
    ];
    const match = candidates.find(
      (candidate) =>
        (typeof candidate === "string" || typeof candidate === "number") &&
        String(candidate).trim() !== ""
    );
    if (match != null) return String(match);
  }
  return `item-${index}`;
}

function getArrayItemLabel(item: unknown, index: number): string {
  const displayValue = getDisplayValue(item);
  if (isPlainObject(displayValue)) {
    const candidates = [
      displayValue.name,
      displayValue.title,
      displayValue.company_name,
      displayValue.role_type,
      displayValue.deal_type,
      displayValue.status,
    ];
    const match = candidates.find(
      (candidate) => typeof candidate === "string" && candidate.trim() !== ""
    );
    if (typeof match === "string") return match;
  }
  return `Item ${index + 1}`;
}

function collectDiffs(
  oldValue: unknown,
  newValue: unknown,
  path: string[] = []
): DiffEntry[] {
  const normalizedOld = getDisplayValue(oldValue);
  const normalizedNew = getDisplayValue(newValue);

  if (valuesEqual(normalizedOld, normalizedNew)) {
    return [];
  }

  if (Array.isArray(normalizedOld) || Array.isArray(normalizedNew)) {
    const oldArray = Array.isArray(normalizedOld) ? normalizedOld : [];
    const newArray = Array.isArray(normalizedNew) ? normalizedNew : [];

    const arePrimitiveArrays =
      oldArray.every(
        (item) =>
          item == null ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
      ) &&
      newArray.every(
        (item) =>
          item == null ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
      );

    if (arePrimitiveArrays) {
      return [{ key: path.join("."), path, oldValue: normalizedOld, newValue: normalizedNew }];
    }

    const oldMap = new Map(
      oldArray.map((item, index) => [getArrayItemKey(item, index), { item, index }])
    );
    const newMap = new Map(
      newArray.map((item, index) => [getArrayItemKey(item, index), { item, index }])
    );
    const orderedKeys = Array.from(
      new Set([...Array.from(oldMap.keys()), ...Array.from(newMap.keys())])
    );

    return orderedKeys.flatMap((itemKey, index) => {
      const oldEntry = oldMap.get(itemKey);
      const newEntry = newMap.get(itemKey);
      const oldItem = oldEntry?.item;
      const newItem = newEntry?.item;
      const itemLabel = getArrayItemLabel(newItem ?? oldItem, oldEntry?.index ?? newEntry?.index ?? index);

      return collectDiffs(oldItem ?? undefined, newItem ?? undefined, [...path, itemLabel]);
    });
  }

  if (isPlainObject(normalizedOld) || isPlainObject(normalizedNew)) {
    const oldObject = isPlainObject(normalizedOld) ? normalizedOld : {};
    const newObject = isPlainObject(normalizedNew) ? normalizedNew : {};
    const keys = Array.from(
      new Set([...Object.keys(oldObject), ...Object.keys(newObject)])
    );

    return keys.flatMap((key) =>
      collectDiffs(oldObject[key], newObject[key], [...path, key])
    );
  }

  const key = path.join(".");
  return [{ key, path, oldValue: normalizedOld, newValue: normalizedNew }];
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const PATH_NOISY_SEGMENTS = new Set([
  "data",
  "company",
  "company_id",
  "company_name",
  "entity_id",
  "parent_entity_id",
  "parent_entity_type",
  "data_type",
  "record_status",
  "new_company_id",
  // payload metadata — not real field changes
  "years_id",
  "change_action",
  "company_record_status",
  "is_new_company",
]);

function getDisplayValue(value: unknown): unknown {
  if (!isPlainObject(value)) return value;

  const keys = Object.keys(value);
  if (
    "data" in value &&
    isPlainObject(value.data) &&
    keys.every((key) => key === "data" || PATH_NOISY_SEGMENTS.has(key))
  ) {
    return value.data;
  }

  return value;
}

function getSimpleDisplayLabel(value: unknown): string | null {
  const displayValue = getDisplayValue(value);
  if (!isPlainObject(displayValue)) return null;

  const candidates = [
    displayValue.company_name,
    displayValue.name,
    displayValue.title,
    displayValue.role_type,
    displayValue.deal_type,
    displayValue.status,
  ];

  const match = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim() !== ""
  );

  return typeof match === "string" ? match : null;
}

function isSimpleNamedObject(value: unknown): boolean {
  const displayValue = getDisplayValue(value);
  if (!isPlainObject(displayValue)) return false;

  const meaningfulEntries = Object.entries(displayValue).filter(
    ([key, entryValue]) =>
      !PATH_NOISY_SEGMENTS.has(key) && entryValue != null && entryValue !== ""
  );

  if (meaningfulEntries.length === 0) {
    return Boolean(getSimpleDisplayLabel(displayValue));
  }

  return meaningfulEntries.every(([key]) =>
    ["company_name", "name", "title", "role_type", "deal_type", "status"].includes(
      key
    )
  );
}

function getItemTitle(value: unknown, fallback: string): string {
  const displayValue = getDisplayValue(value);
  if (!isPlainObject(displayValue)) return fallback;

  const candidates = [
    displayValue.name,
    displayValue.title,
    displayValue.company_name,
    displayValue.role_type,
    displayValue.deal_type,
    displayValue.status,
  ];

  const match = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim() !== ""
  );

  return typeof match === "string" ? match : fallback;
}

function getCompanyData(payload: Record<string, unknown>): Record<string, unknown> | null {
  const company = isPlainObject(payload.company) ? payload.company : null;
  const companyData = company && isPlainObject(company.data) ? company.data : null;
  return companyData || null;
}

type CompanyDiffListKey =
  | "primary_sectors_diff"
  | "secondary_sectors_diff"
  | "investors_diff"
  | "peers_competitors_diff"
  | "potential_acquirers_diff"
  | "acquisition_targets_diff";

function getCompanyDiffList(
  payload: Record<string, unknown>,
  key: CompanyDiffListKey
): DiffListPayload | null {
  const data = getCompanyData(payload);
  const value = data ? data[key] : null;
  if (!isPlainObject(value)) return null;
  const added = Array.isArray(value.added) ? value.added : [];
  const removed = Array.isArray(value.removed) ? value.removed : [];
  if (added.length === 0 && removed.length === 0) return null;
  return { added, removed };
}

function getOldSectorList(
  oldPayload: Record<string, unknown>,
  key: "primary_sectors" | "secondary_sectors"
): string[] {
  const data = getCompanyData(oldPayload);
  const raw = data ? data[key] : null;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return [];
}

type CompanyRelationListKey =
  | "investors"
  | "peers_competitors"
  | "potential_acquirers"
  | "acquisition_targets";

function getOldCompanyRelationList(
  oldPayload: Record<string, unknown>,
  key: CompanyRelationListKey
): Array<{ company_id: string; company_name: string }> {
  const data = getCompanyData(oldPayload);
  const raw = data ? data[key] : null;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPlainObject).map((item) => ({
    company_id: String(item.company_id ?? ""),
    company_name: String(item.company_name ?? ""),
  }));
}

function getOldInvestors(oldPayload: Record<string, unknown>) {
  return getOldCompanyRelationList(oldPayload, "investors");
}

function getCompanyArrayField(
  payload: Record<string, unknown>,
  key: string
): Record<string, unknown>[] {
  const data = getCompanyData(payload);
  const raw = data ? data[key] : null;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPlainObject) as Record<string, unknown>[];
}

function getParentCompanyChange(
  oldPayload: Record<string, unknown>,
  newPayload: Record<string, unknown>
): {
  oldName: string;
  oldId: string;
  newName: string;
  newId: string;
  isNew: boolean;
  newParent: Record<string, unknown>;
  newProfile?: Record<string, unknown>;
} | null {
  const newData = getCompanyData(newPayload);
  const newParent = newData ? newData.parent_company : null;
  if (!isPlainObject(newParent)) return null;
  const newName = String(newParent.company_name ?? "");
  const newId = String(newParent.company_id ?? "");
  const isNew = newParent.company_record_status === "new" || newParent.is_new_company === true;

  const oldData = getCompanyData(oldPayload);
  const oldParent = oldData ? oldData.parent_company : null;
  const oldName = isPlainObject(oldParent) ? String(oldParent.company_name ?? "") : "";
  const oldId = isPlainObject(oldParent) ? String(oldParent.company_id ?? "") : "";

  if (!newName && !newId) return null;
  return {
    oldName,
    oldId,
    newName,
    newId,
    isNew,
    newParent,
    newProfile: isPlainObject(newParent.new_company_profile)
      ? (newParent.new_company_profile as Record<string, unknown>)
      : undefined,
  };
}

function getDiffItemLabel(value: unknown): string {
  const displayValue = getDisplayValue(value);
  if (typeof displayValue === "string") return displayValue;
  if (typeof displayValue === "number") return String(displayValue);
  if (!isPlainObject(displayValue)) return formatValue(displayValue);
  const candidates = [
    displayValue.label,
    displayValue.company_name,
    displayValue.name,
    displayValue.value,
    displayValue.company_id,
  ];
  const match = candidates.find(
    (c) => (typeof c === "string" || typeof c === "number") && String(c).trim() !== ""
  );
  return match != null ? String(match) : formatValue(displayValue);
}

function isNewCompanyDiffItem(value: unknown): boolean {
  const displayValue = getDisplayValue(value);
  return (
    isPlainObject(displayValue) &&
    (displayValue.company_record_status === "new" || displayValue.is_new_company === true)
  );
}

/** Hides “new company” rows from the chip card; those profiles appear in Section A. */
function visibleRelationCompanyDiff(
  diff: DiffListPayload | null
): DiffListPayload | null {
  if (!diff) return null;
  const added = diff.added.filter((item) => !isNewCompanyDiffItem(item));
  const removed = diff.removed;
  if (added.length === 0 && removed.length === 0) return null;
  return { added, removed };
}

function AdminControls({
  decisionKey,
  decisions,
  onDecide,
  serverRejectedHighlight,
  baselineLocked,
}: {
  decisionKey: string;
  decisions: Record<string, DecisionState>;
  onDecide: (key: string, value: DecisionState) => void;
  /** Persisted rejection exists for this decision suffix — emphasis styling */
  serverRejectedHighlight?: boolean;
  /** When true with highlight: hide Accept/Reject/Clear until proposal differs from saved rejection baseline */
  baselineLocked?: boolean;
}) {
  const decision = decisions[decisionKey];
  const gated = Boolean(serverRejectedHighlight && baselineLocked);

  return (
    <div
      className={`mt-3 flex flex-wrap items-center gap-2 ${
        serverRejectedHighlight ? "rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2" : ""
      }`}
    >
      {gated ? (
        <div className="text-[11px] font-medium text-rose-900">
          Rejected in review — edit the proposed values above to enable Accept, Reject, and Clear.
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecide(decisionKey, decision === "approve" ? undefined : "approve");
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              decision === "approve"
                ? "bg-emerald-600 text-white"
                : "border border-[#16a34a] bg-white text-[#166534] hover:bg-[#f0fdf4]"
            }`}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecide(decisionKey, decision === "reject" ? undefined : "reject");
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              decision === "reject"
                ? "bg-rose-600 text-white"
                : "border border-[#dc2626] bg-white text-[#991b1b] hover:bg-[#fef2f2]"
            }`}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecide(decisionKey, undefined);
            }}
            className="cursor-pointer rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]"
          >
            Clear
          </button>
          {decision && (
            <span
              className={`text-[11px] uppercase tracking-[0.14em] ${
                serverRejectedHighlight ? "text-rose-700" : "text-[#64748b]"
              }`}
            >
              {decision === "approve" ? "Marked accept" : "Marked reject"}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function SectorDiffCard({
  title,
  diff,
  existingList,
  requestId,
  decisions,
  onDecide,
  sectorOptions = [],
  serverRejectBaselines,
}: {
  title: string;
  diff: DiffListPayload;
  existingList: string[];
  requestId: number;
  decisions: Record<string, DecisionState>;
  onDecide: (key: string, value: DecisionState) => void;
  sectorOptions?: LookupOption[];
  serverRejectBaselines?: Record<string, string>;
}) {
  const decisionKey = `${requestId}:sector_diff:${title}`;
  const suffix = `sector_diff:${title}`;
  const [isEditing, setIsEditing] = useState(false);
  const [editAdded, setEditAdded] = useState<string[]>(() => diff.added.map((i) => getDiffItemLabel(i)));
  const [editRemoved, setEditRemoved] = useState<string[]>(() => diff.removed.map((i) => getDiffItemLabel(i)));
  const [newSectorInput, setNewSectorInput] = useState("");
  const [sectorDropOpen, setSectorDropOpen] = useState(false);
  const sectorDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectorDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (!sectorDropRef.current?.contains(e.target as Node)) {
        setSectorDropOpen(false);
        setNewSectorInput("");
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [sectorDropOpen]);

  const activeAdded = isEditing ? editAdded : diff.added.map((i) => getDiffItemLabel(i));
  const activeRemoved = isEditing ? editRemoved : diff.removed.map((i) => getDiffItemLabel(i));

  const baselineFp = serverRejectBaselines?.[suffix];
  const proposalFp = stableStringifyForReviewBaseline({
    added: [...activeAdded].sort(),
    removed: [...activeRemoved].sort(),
  });
  const baselineLocked = baselineFp != null && proposalFp === baselineFp;
  const serverRejectedHighlight = baselineFp != null;

  const removedLabels = new Set(activeRemoved);
  const unchangedLabels = existingList.filter((s) => !removedLabels.has(s));

  return (
    <div
      className={`rounded-2xl border p-5 ${
        serverRejectedHighlight
          ? "border-rose-300 bg-rose-50/50 ring-1 ring-rose-200"
          : "border-[#dbe3f0] bg-[#f8fafc]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-[#0f172a]">{title}</span>
        {!isEditing && (
          <button type="button" onClick={() => setIsEditing(true)}
            className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-xs text-[#475569] hover:bg-white/80">
            ✏️ Edit
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {unchangedLabels.map((label) => (
          <span key={`existing-${label}`}
            className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-medium text-[#334155]">
            {label}
          </span>
        ))}
        {activeRemoved.map((label, index) => (
          <span key={`removed-${label}-${index}`}
            className={`inline-flex items-center gap-1 rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1 text-xs font-medium text-[#991b1b] line-through`}>
            {label}
            {isEditing && (
              <button type="button" onClick={() => setEditRemoved(editRemoved.filter((_, i) => i !== index))}
                className="ml-1 text-[10px] no-underline not-italic font-bold text-[#991b1b] opacity-70 hover:opacity-100">×</button>
            )}
          </span>
        ))}
        {activeAdded.map((label, index) => (
          <span key={`added-${label}-${index}`}
            className="inline-flex items-center gap-1 rounded-full border border-[#86efac] bg-[#f0fdf4] px-3 py-1 text-xs font-medium text-[#166534]">
            + {label}
            {isEditing && (
              <button type="button" onClick={() => setEditAdded(editAdded.filter((_, i) => i !== index))}
                className="ml-1 text-[10px] font-bold text-[#166534] opacity-70 hover:opacity-100">×</button>
            )}
          </span>
        ))}
        {unchangedLabels.length === 0 && activeRemoved.length === 0 && activeAdded.length === 0 && (
          <span className="text-sm text-[#94a3b8]">No sectors</span>
        )}
      </div>

      {isEditing && (
        <div className="mt-3 space-y-2">
          {sectorOptions.length > 0 ? (
            /* Searchable dropdown */
            <div ref={sectorDropRef} className="relative">
              <button
                type="button"
                onClick={() => setSectorDropOpen((p) => !p)}
                className="flex w-full items-center justify-between rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#334155] focus:outline-none"
              >
                <span className="text-[#94a3b8]">Add sector…</span>
                <span className="ml-1 text-[#94a3b8]">▾</span>
              </button>
              {sectorDropOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#cbd5e1] bg-white shadow-xl">
                  <div className="sticky top-0 border-b border-[#f1f5f9] bg-white p-1.5">
                    <input
                      autoFocus
                      value={newSectorInput}
                      onChange={(e) => setNewSectorInput(e.target.value)}
                      placeholder="Search sector…"
                      className="w-full rounded border border-[#e2e8f0] px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  {sectorOptions
                    .filter(
                      (o) =>
                        !editAdded.includes(o.label) &&
                        !editAdded.includes(o.value) &&
                        (newSectorInput === "" ||
                          o.label.toLowerCase().includes(newSectorInput.toLowerCase()))
                    )
                    .map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setEditAdded([...editAdded, opt.label]);
                          setSectorDropOpen(false);
                          setNewSectorInput("");
                        }}
                        className="block w-full px-3 py-1.5 text-left text-xs text-[#334155] hover:bg-[#f1f5f9]"
                      >
                        {opt.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            /* Fallback: free-text input */
            <div className="flex gap-2">
              <input
                value={newSectorInput}
                onChange={(e) => setNewSectorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSectorInput.trim()) {
                    setEditAdded([...editAdded, newSectorInput.trim()]);
                    setNewSectorInput("");
                  }
                }}
                placeholder="Add sector…"
                className="flex-1 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs focus:outline-none"
              />
              <button type="button"
                onClick={() => { if (newSectorInput.trim()) { setEditAdded([...editAdded, newSectorInput.trim()]); setNewSectorInput(""); } }}
                className="rounded-md border border-[#bfdbfe] bg-white px-3 py-1.5 text-xs font-semibold text-[#1d4ed8] hover:bg-[#dbeafe]">
                Add
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsEditing(false)}
              className="rounded-md bg-[#1d4ed8] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]">
              Save edits
            </button>
            <button type="button" onClick={() => {
              setEditAdded(diff.added.map((i) => getDiffItemLabel(i)));
              setEditRemoved(diff.removed.map((i) => getDiffItemLabel(i)));
              setIsEditing(false);
            }} className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]">
              Reset
            </button>
          </div>
          <p className="text-[11px] italic text-[#94a3b8]">
            Remove chips you don&apos;t want applied, or pick new sectors from the dropdown.
          </p>
        </div>
      )}

      <AdminControls
        decisionKey={decisionKey}
        decisions={decisions}
        onDecide={onDecide}
        serverRejectedHighlight={serverRejectedHighlight}
        baselineLocked={baselineLocked}
      />
    </div>
  );
}

type NewCompanyProfileData = {
  name?: string;
  description?: string;
  primary_sectors?: string[];
  secondary_sectors?: string[];
  year_founded?: string;
  ownership?: string;
  website?: string;
  hq?: string;
  primary_business_focus?: string;
  primary_business_focus_id?: string;
};

function NewCompanyProfilePanel({ profile }: { profile: NewCompanyProfileData }) {
  const rows: [string, string][] = [
    ["Name", profile.name ?? ""],
    ["Description", profile.description ?? ""],
    ["Primary sectors", (profile.primary_sectors ?? []).join(", ")],
    ["Secondary sectors", (profile.secondary_sectors ?? []).join(", ")],
    ["Year founded", profile.year_founded ?? ""],
    ["Ownership", profile.ownership ?? ""],
    [
      "Business focus",
      profile.primary_business_focus ?? profile.primary_business_focus_id ?? "",
    ],
    ["Website", profile.website ?? ""],
    ["HQ", profile.hq ?? ""],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  if (rows.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
        New company profile
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="text-xs text-[#334155]">
            <span className="font-medium text-[#1e3a5f]">{label}:</span> {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function CorporateEventProfilePanel({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const CE_FIELD_LABELS: [string, string][] = [
    ["title", "Title"],
    ["deal_type", "Deal Type"],
    ["deal_status", "Deal Status"],
    ["announcement_date", "Announcement Date"],
    ["closed_date", "Closed Date"],
    ["funding_stage", "Funding Stage"],
    ["amount_millions", "Amount (M)"],
    ["currency", "Currency"],
    ["source_url", "Source URL"],
    ["long_description", "Description"],
  ];

  const basicRows = CE_FIELD_LABELS
    .map(([key, label]) => [label, String(data[key] ?? "")] as [string, string])
    .filter(([, v]) => Boolean(v));

  const counterparties = Array.isArray(data.counterparties)
    ? (data.counterparties as unknown[]).filter(isPlainObject)
    : [];

  return (
    <div className="space-y-3">
      {/* Basic CE fields */}
      {basicRows.length > 0 && (
        <div className="grid gap-1 rounded-xl border border-[#bfdbfe] bg-white p-3 sm:grid-cols-2">
          {basicRows.map(([label, value]) => (
            <div key={label} className="text-xs text-[#334155]">
              <span className="font-medium text-[#1e3a5f]">{label}:</span>{" "}
              {value}
            </div>
          ))}
        </div>
      )}

      {/* Counterparties */}
      {counterparties.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
            Counterparties ({counterparties.length})
          </div>
          {counterparties.map((cp, cpIdx) => {
            const cpData = cp as Record<string, unknown>;
            const individuals = Array.isArray(cpData.individuals)
              ? (cpData.individuals as unknown[]).filter(isPlainObject)
              : [];
            const isNewCp = cpData.company_record_status === "new" || cpData.is_new_company === true;

            return (
              <div
                key={cpIdx}
                className="rounded-xl border border-[#e2e8f0] bg-white p-3"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#0f172a]">
                    {String(cpData.company_name || "Unknown Company")}
                  </span>
                  {cpData.role_type ? (
                    <span className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-[10px] text-[#475569]">
                      {String(cpData.role_type)}
                    </span>
                  ) : null}
                  {isNewCp && (
                    <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
                      NEW
                    </span>
                  )}
                  {cpData.record_status === "new" && !isNewCp && (
                    <span className="rounded-full bg-[#fef9c3] px-2 py-0.5 text-[10px] font-semibold text-[#854d0e]">
                      new relationship
                    </span>
                  )}
                </div>

                {/* CP detail rows */}
                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[#64748b]">
                  {cpData.website_url ? (
                    <span>Web: {String(cpData.website_url)}</span>
                  ) : null}
                  {cpData.linkedin_url ? (
                    <span>LI: {String(cpData.linkedin_url)}</span>
                  ) : null}
                  {cpData.press_release_url ? (
                    <span>PR: {String(cpData.press_release_url)}</span>
                  ) : null}
                </div>

                {/* Individuals */}
                {individuals.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Individuals
                    </div>
                    {individuals.map((ind, indIdx) => {
                      const indData = ind as Record<string, unknown>;
                      const roles = Array.isArray(indData.roles)
                        ? (indData.roles as string[]).filter(Boolean).join(", ")
                        : "";
                      return (
                        <div
                          key={indIdx}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-3 py-1.5"
                        >
                          <span className="text-xs font-medium text-[#0f172a]">
                            {String(indData.name || "Unknown")}
                          </span>
                          {roles && (
                            <span className="text-[11px] text-[#64748b]">{roles}</span>
                          )}
                          {indData.status ? (
                            <span className="rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] text-[#166534]">
                              {String(indData.status)}
                            </span>
                          ) : null}
                          {indData.record_status === "new" && (
                            <span className="rounded-full bg-[#fef9c3] px-2 py-0.5 text-[10px] font-semibold text-[#854d0e]">
                              new
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InvestorDiffCard({
  diff,
  existingInvestors,
  requestId,
  decisions,
  onDecide,
  title = "Investors",
  decisionSuffix = "investors_diff",
  subtitle = "— new company profiles are shown above",
  emptyLabel = "No investors",
  serverRejectBaselines,
}: {
  diff: DiffListPayload;
  existingInvestors: Array<{ company_id: string; company_name: string }>;
  requestId: number;
  decisions: Record<string, DecisionState>;
  onDecide: (key: string, value: DecisionState) => void;
  title?: string;
  /** Unique segment for Accept/Reject decision key, e.g. peers_competitors_diff */
  decisionSuffix?: string;
  subtitle?: string;
  emptyLabel?: string;
  serverRejectBaselines?: Record<string, string>;
}) {
  const decisionKey = `${requestId}:${decisionSuffix}`;
  const baselineFp = serverRejectBaselines?.[decisionSuffix];
  const proposalFp = stableStringifyForReviewBaseline({
    added: diff.added.map((i) => getDisplayValue(i)),
    removed: diff.removed.map((i) => getDisplayValue(i)),
  });
  const baselineLocked = baselineFp != null && proposalFp === baselineFp;
  const serverRejectedHighlight = baselineFp != null;
  const removedIds = new Set(
    diff.removed.map((i) => {
      const d = getDisplayValue(i);
      return isPlainObject(d) ? String(d.company_id ?? "") : "";
    })
  );
  const unchanged = existingInvestors.filter((inv) => !removedIds.has(inv.company_id));

  return (
    <div
      className={`rounded-2xl border p-5 ${
        serverRejectedHighlight
          ? "border-rose-300 bg-rose-50/50 ring-1 ring-rose-200"
          : "border-[#dbe3f0] bg-[#f8fafc]"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base font-semibold text-[#0f172a]">{title}</span>
        {subtitle ? (
          <span className="text-xs text-[#64748b]">{subtitle}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {unchanged.map((inv) => (
          <span
            key={`existing-${inv.company_id || inv.company_name}`}
            className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-medium text-[#334155]"
          >
            {inv.company_name || inv.company_id}
          </span>
        ))}
        {diff.removed.map((item, index) => (
          <span
            key={`removed-${getDiffItemLabel(item)}-${index}`}
            className="rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1 text-xs font-medium text-[#991b1b] line-through"
          >
            {getDiffItemLabel(item)}
          </span>
        ))}
        {diff.added.map((item, index) => {
          const display = getDisplayValue(item);
          const label = getDiffItemLabel(item);
          const isNew =
            isPlainObject(display) &&
            (display.company_record_status === "new" || display.is_new_company === true);
          return (
            <span
              key={`added-${label}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#86efac] bg-[#f0fdf4] px-3 py-1 text-xs font-medium text-[#166534]"
            >
              <span>+ {label}</span>
              {isNew && (
                <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
                  NEW
                </span>
              )}
            </span>
          );
        })}
        {unchanged.length === 0 && diff.removed.length === 0 && diff.added.length === 0 && (
          <span className="text-sm text-[#94a3b8]">{emptyLabel}</span>
        )}
      </div>
      <AdminControls
        decisionKey={decisionKey}
        decisions={decisions}
        onDecide={onDecide}
        serverRejectedHighlight={serverRejectedHighlight}
        baselineLocked={baselineLocked}
      />
    </div>
  );
}

function ArrayFieldDiffCard({
  title,
  columns,
  oldRows,
  newRows,
  requestId,
  decisions,
  onDecide,
  serverRejectBaselines,
}: {
  title: string;
  columns: { key: string; label: string }[];
  oldRows: Record<string, unknown>[];
  newRows: Record<string, unknown>[];
  requestId: number;
  decisions: Record<string, DecisionState>;
  onDecide: (key: string, value: DecisionState) => void;
  serverRejectBaselines?: Record<string, string>;
}) {
  const decisionKey = `${requestId}:array_field:${title}`;
  const suffix = `array_field:${title}`;
  const baselineFp = serverRejectBaselines?.[suffix];
  const proposalFp = stableStringifyForReviewBaseline(newRows);
  const baselineLocked = baselineFp != null && proposalFp === baselineFp;
  const serverRejectedHighlight = baselineFp != null;

  const renderTable = (rows: Record<string, unknown>[], isNew: boolean) => {
    if (rows.length === 0) return <span className="text-sm text-[#94a3b8]">None</span>;
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: "left",
                  padding: "4px 6px",
                  color: isNew ? "#2563eb" : "#64748b",
                  fontWeight: 600,
                  borderBottom: `1px solid ${isNew ? "#bfdbfe" : "#e2e8f0"}`,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "4px 6px",
                    color: isNew ? "#1e3a5f" : "#334155",
                    borderBottom: `1px solid ${isNew ? "#dbeafe" : "#f1f5f9"}`,
                  }}
                >
                  {String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div
      className={`rounded-2xl border p-5 ${
        serverRejectedHighlight
          ? "border-rose-300 bg-rose-50/50 ring-1 ring-rose-200"
          : "border-[#dbe3f0] bg-[#f8fafc]"
      }`}
    >
      <div className="mb-3 text-base font-semibold text-[#0f172a]">{title}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] p-4">
          <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[#64748b]">
            Current value
          </div>
          {renderTable(oldRows, false)}
        </div>
        <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[#2563eb]">
            Proposed value
          </div>
          {renderTable(newRows, true)}
        </div>
      </div>
      <AdminControls
        decisionKey={decisionKey}
        decisions={decisions}
        onDecide={onDecide}
        serverRejectedHighlight={serverRejectedHighlight}
        baselineLocked={baselineLocked}
      />
    </div>
  );
}

function ParentCompanyCard({
  change,
  requestId,
  decisions,
  onDecide,
  serverRejectBaselines,
}: {
  change: {
    oldName: string;
    oldId: string;
    newName: string;
    newId: string;
    isNew: boolean;
    newParent: Record<string, unknown>;
    newProfile?: Record<string, unknown>;
  };
  requestId: number;
  decisions: Record<string, DecisionState>;
  onDecide: (key: string, value: DecisionState) => void;
  serverRejectBaselines?: Record<string, string>;
}) {
  const { ownershipOptions, yearOptions } = useLookup();
  const decisionKey = `${requestId}:parent_company`;
  const suffix = "parent_company";
  const [isEditing, setIsEditing] = useState(false);
  const [editParent, setEditParent] = useState<Record<string, unknown>>({
    ...change.newParent,
  });
  const [editProfile, setEditProfile] = useState<Record<string, unknown>>(
    change.newProfile ? { ...change.newProfile } : {}
  );

  const proposedName = String(editParent.company_name ?? change.newName);
  const baselineFp = serverRejectBaselines?.[suffix];
  const proposalFp = stableStringifyForReviewBaseline({
    parent: editParent,
    profile: editProfile,
  });
  const baselineLocked = baselineFp != null && proposalFp === baselineFp;
  const serverRejectedHighlight = baselineFp != null;
  const showProfileEditor =
    (editParent.company_record_status === "new" || editParent.is_new_company === true) &&
    (change.isNew || Object.keys(editProfile).length > 0);

  return (
    <div
      className={`rounded-2xl border p-5 ${
        serverRejectedHighlight
          ? "border-rose-300 bg-rose-50/50 ring-1 ring-rose-200"
          : "border-[#dbe3f0] bg-[#f8fafc]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-[#0f172a]">Parent Company</div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-xs text-[#475569] hover:bg-white/80"
          >
            ✏️ Edit
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] p-4">
          <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#64748b]">
            Current
          </div>
          {change.oldName ? (
            <span className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-medium text-[#334155]">
              {change.oldName}
            </span>
          ) : (
            <span className="text-sm text-[#94a3b8]">None</span>
          )}
        </div>
        <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#2563eb]">
            Proposed
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#86efac] bg-[#f0fdf4] px-3 py-1 text-xs font-medium text-[#166534]">
            <span>{proposedName}</span>
            {change.isNew && (
              <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
                NEW
              </span>
            )}
          </div>
        </div>
      </div>
      {isEditing && (
        <>
          <InlineFieldEditor
            data={editParent}
            onChange={setEditParent}
            fieldLabels={[["company_name", "Parent Company Name"]]}
          />
          {showProfileEditor && (
            <InlineFieldEditor
              data={editProfile}
              onChange={setEditProfile}
              fieldLabels={COMPANY_PROFILE_FIELDS}
              textareaKeys={new Set(["description"])}
              selectOptions={{
                ownership: ownershipOptions,
                year_founded: yearOptions,
              }}
            />
          )}
          <EditModeFooter
            onSave={() => setIsEditing(false)}
            onCancel={() => {
              setEditParent({ ...change.newParent });
              setEditProfile(change.newProfile ? { ...change.newProfile } : {});
              setIsEditing(false);
            }}
          />
        </>
      )}
      {!isEditing && showProfileEditor && Object.keys(editProfile).length > 0 && (
        <NewCompanyProfilePanel profile={editProfile as NewCompanyProfileData} />
      )}
      <AdminControls
        decisionKey={decisionKey}
        decisions={decisions}
        onDecide={onDecide}
        serverRejectedHighlight={serverRejectedHighlight}
        baselineLocked={baselineLocked}
      />
    </div>
  );
}

function renderPrimitive(value: unknown) {
  return <span className="text-sm leading-6 text-[#0f172a]">{formatValue(value)}</span>;
}

function renderReadableValue(value: unknown, emptyLabel = "Empty") {
  const displayValue = getDisplayValue(value);

  if (displayValue == null || displayValue === "") {
    return <span className="text-sm text-[#94a3b8]">{emptyLabel}</span>;
  }

  if (
    typeof displayValue === "string" ||
    typeof displayValue === "number" ||
    typeof displayValue === "boolean"
  ) {
    return renderPrimitive(displayValue);
  }

  if (Array.isArray(displayValue)) {
    if (displayValue.length === 0) {
      return <span className="text-sm text-[#94a3b8]">None</span>;
    }

    const primitiveArray = displayValue.every(
      (item) =>
        item == null ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
    );

    if (primitiveArray) {
      return (
        <div className="flex flex-wrap gap-2">
          {displayValue.map((item, index) => (
            <span
              key={`${String(item)}-${index}`}
              className="rounded-full border border-[#dbe3f0] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#334155]"
            >
              {formatValue(item)}
            </span>
          ))}
        </div>
      );
    }

    const namedArray = displayValue.every((item) => isSimpleNamedObject(item));
    if (namedArray) {
      return (
        <div className="flex flex-wrap gap-2">
          {displayValue.map((item, index) => (
            <span
              key={`${getSimpleDisplayLabel(item)}-${index}`}
              className="rounded-full border border-[#dbe3f0] bg-white px-3 py-1 text-xs font-medium text-[#0f172a]"
            >
              {getSimpleDisplayLabel(item)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {displayValue.map((item, index) => (
          <div
            key={`${getItemTitle(item, `Item ${index + 1}`)}-${index}`}
            className="rounded-xl border border-[#e2e8f0] bg-white p-4"
          >
            <div className="mb-3 text-sm font-semibold text-[#0f172a]">
              {getItemTitle(item, `Item ${index + 1}`)}
            </div>
            {renderReadableValue(item, "No details")}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(displayValue)) {
    const simpleLabel = getSimpleDisplayLabel(displayValue);
    const entries = Object.entries(displayValue).filter(
      ([key]) => !PATH_NOISY_SEGMENTS.has(key)
    );

    if (simpleLabel && isSimpleNamedObject(displayValue)) {
      return renderPrimitive(simpleLabel);
    }

    if (entries.length === 0) {
      return <span className="text-sm text-[#94a3b8]">No details</span>;
    }

    return (
      <div className="space-y-3">
        {entries.map(([key, entryValue]) => (
          <div
            key={key}
            className="rounded-xl border border-[#e2e8f0] bg-white p-4"
          >
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
              {humanizeSegment(key)}
            </div>
            {renderReadableValue(entryValue)}
          </div>
        ))}
      </div>
    );
  }

  return renderPrimitive(displayValue);
}

function renderPath(path: string[]): string {
  const meaningfulSegments = path.filter(
    (segment) => !PATH_NOISY_SEGMENTS.has(segment) && !GROUPED_SEGMENTS.has(segment)
  );
  const lastMeaningfulSegment = meaningfulSegments[meaningfulSegments.length - 1];

  if (lastMeaningfulSegment) {
    return humanizeSegment(lastMeaningfulSegment);
  }

  for (const segment of path) {
    if (SECTION_LABELS[segment]) {
      return SECTION_LABELS[segment];
    }
  }

  const fallbackSegments = path.filter((segment) => !PATH_NOISY_SEGMENTS.has(segment));
  const lastSegment = fallbackSegments[fallbackSegments.length - 1];

  return humanizeSegment(lastSegment || "Change");
}

function renderContextPath(path: string[]): string | null {
  const sectionSegment = path.find((segment) => SECTION_LABELS[segment]);
  const meaningfulSegments = path.filter(
    (segment) =>
      !PATH_NOISY_SEGMENTS.has(segment) &&
      !GROUPED_SEGMENTS.has(segment)
  );

  if (meaningfulSegments.length <= 1) {
    return sectionSegment ? SECTION_LABELS[sectionSegment] : null;
  }

  return meaningfulSegments.slice(0, -1).join(" / ");
}


// ─────────────────────────────────────────────────────────────
// Hierarchical CE review — IndividualCard / CounterpartyCard / CorporateEventCard
// ─────────────────────────────────────────────────────────────

type HierarchyApprovalStatus =
  | "idle"
  | "approving"
  | "rejecting"
  | "approved"
  | "rejected"
  | "error";

// Small helper: scope pill label + description
function ApprovalScopeNote({ text }: { text: string }) {
  return (
    <p className="mt-2 text-[11px] italic text-[#94a3b8]">{text}</p>
  );
}

// Approve/Reject button pair used by all three hierarchy levels
function HierarchyActionBar({
  label,
  status,
  disabledReason,
  onApprove,
  onReject,
  onEdit,
  isEditing,
}: {
  label: string;
  status: HierarchyApprovalStatus;
  disabledReason?: string;
  onApprove: () => void;
  onReject: () => void;
  onEdit?: () => void;
  isEditing?: boolean;
}) {
  const busy = status === "approving" || status === "rejecting";
  const disabled = busy || !!disabledReason;

  if (status === "approved") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#166534]">
          Approved ✓
        </span>
        {onEdit && (
          <button type="button" onClick={onEdit}
            className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-xs text-[#475569] hover:bg-[#f8fafc]">
            Edit &amp; Re-approve
          </button>
        )}
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1 text-xs font-semibold text-[#991b1b]">
          Rejected ✗
        </span>
        {onEdit && (
          <button type="button" onClick={onEdit}
            className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-xs text-[#475569] hover:bg-[#f8fafc]">
            Edit &amp; Reconsider
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onApprove}
        disabled={disabled}
        title={disabledReason}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          status === "approving"
            ? "bg-emerald-600 text-white"
            : "border border-[#16a34a] bg-white text-[#166534] hover:bg-[#f0fdf4]"
        }`}
      >
        {status === "approving" ? "Approving…" : `Approve ${label}`}
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={disabled}
        title={disabledReason}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          status === "rejecting"
            ? "bg-rose-600 text-white"
            : "border border-[#dc2626] bg-white text-[#991b1b] hover:bg-[#fef2f2]"
        }`}
      >
        {status === "rejecting" ? "Rejecting…" : `Reject ${label}`}
      </button>
      {onEdit && !isEditing && !disabled && (
        <button type="button" onClick={onEdit}
          className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]">
          ✏️ Edit
        </button>
      )}
      {disabledReason && (
        <span className="text-[11px] text-[#94a3b8]">{disabledReason}</span>
      )}
    </div>
  );
}

// ── Shared inline field editor ──────────────────────────────────────────────
// A simple two-column grid of text inputs for any flat Record<string, unknown>
/** Searchable select used inside InlineFieldEditor */
function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: LookupOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      options.filter((o) =>
        query === "" || o.label.toLowerCase().includes(query.toLowerCase())
      ),
    [options, query]
  );

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((p) => !p); setQuery(""); }}
        className="flex w-full items-center justify-between rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
      >
        <span className={selected ? "" : "text-[#94a3b8]"}>
          {selected ? selected.label : "Select…"}
        </span>
        <span className="ml-1 text-[#94a3b8]">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[#cbd5e1] bg-white shadow-xl">
          <div className="sticky top-0 border-b border-[#f1f5f9] bg-white p-1.5">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded border border-[#e2e8f0] px-2 py-1 text-xs focus:outline-none"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#94a3b8]">No options</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(""); }}
                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-[#f1f5f9] ${opt.value === value ? "bg-[#dbeafe] font-semibold text-[#1d4ed8]" : "text-[#334155]"}`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function InlineFieldEditor({
  data,
  onChange,
  fieldLabels,
  textareaKeys,
  selectOptions,
}: {
  data: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
  fieldLabels: [string, string][];
  textareaKeys?: Set<string>;
  /** Map from field key → options array. If present for a key, renders a searchable select. */
  selectOptions?: Record<string, LookupOption[]>;
}) {
  return (
    <div className="mt-3 grid gap-3 rounded-xl border border-[#bfdbfe] bg-[#f0f7ff] p-3 sm:grid-cols-2">
      {fieldLabels.map(([key, label]) => {
        const val = String(data[key] ?? "");
        const isTextarea = textareaKeys?.has(key);
        const opts = selectOptions?.[key];
        return (
          <div key={key} className={isTextarea ? "sm:col-span-2" : ""}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
              {label}
            </label>
            {opts ? (
              <InlineSelect
                value={val}
                options={opts}
                onChange={(v) => onChange({ ...data, [key]: v })}
              />
            ) : isTextarea ? (
              <textarea
                value={val}
                rows={3}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                className="w-full resize-y rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
              />
            ) : (
              <input
                value={val}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                className="w-full rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

type ReviewManagementPerson = {
  localId: string;
  name: string;
  roles: string[];
  status: string;
  location: string;
  bio: string;
  linkedin_url: string;
  company_profile_url: string;
  individual_id?: string;
};

function createReviewManagementPerson(
  seed?: Partial<ReviewManagementPerson>
): ReviewManagementPerson {
  return {
    localId:
      seed?.localId ||
      `management-person-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: seed?.name || "",
    roles:
      Array.isArray(seed?.roles) && seed.roles.length > 0 ? seed.roles : [""],
    status: seed?.status || "Current",
    location: seed?.location || "",
    bio: seed?.bio || "",
    linkedin_url: seed?.linkedin_url || "",
    company_profile_url: seed?.company_profile_url || "",
    individual_id: seed?.individual_id,
  };
}

function normalizeReviewManagementPerson(
  value: unknown,
  fallbackId?: string
): ReviewManagementPerson | null {
  if (!isPlainObject(value)) return null;
  const rawRoles = Array.isArray(value.roles)
    ? value.roles.map((role) => String(role ?? "").trim()).filter(Boolean)
    : typeof value.role_type === "string" && value.role_type.trim()
      ? [value.role_type.trim()]
      : [];

  return createReviewManagementPerson({
    localId:
      typeof value.localId === "string" && value.localId
        ? value.localId
        : fallbackId,
    name: String(value.name ?? "").trim(),
    roles: rawRoles.length > 0 ? rawRoles : [""],
    status: String(value.status ?? "Current").trim() || "Current",
    location: String(value.location ?? "").trim(),
    bio: String(value.bio ?? "").trim(),
    linkedin_url: String(value.linkedin_url ?? "").trim(),
    company_profile_url: String(value.company_profile_url ?? "").trim(),
    individual_id:
      value.individual_id != null && String(value.individual_id).trim()
        ? String(value.individual_id).trim()
        : undefined,
  });
}

function getManagementTeamFromData(data: Record<string, unknown>): ReviewManagementPerson[] {
  const raw = Array.isArray(data.management_team)
    ? data.management_team
    : Array.isArray(data.management_people)
      ? data.management_people
      : [];

  return raw
    .map((person, index) =>
      normalizeReviewManagementPerson(person, `management-person-${index}`)
    )
    .filter((person): person is ReviewManagementPerson => Boolean(person));
}

function getRequestIndividualOptions(payloads: Record<string, unknown>[]): ReviewManagementPerson[] {
  const collected: ReviewManagementPerson[] = [];
  const seen = new Set<string>();

  const pushPerson = (candidate: unknown, fallbackId: string) => {
    const person = normalizeReviewManagementPerson(candidate, fallbackId);
    if (!person || !person.name) return;
    const key = `${person.individual_id || ""}::${person.name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(person);
  };

  payloads.forEach((payload, payloadIndex) => {
    const managementRecords = Array.isArray(payload.management_people)
      ? payload.management_people
      : [];
    managementRecords.forEach((record, recordIndex) => {
      if (!isPlainObject(record)) return;
      const data = isPlainObject(record.data) ? record.data : record;
      pushPerson(data, `request-management-${payloadIndex}-${recordIndex}`);
    });

    const corporateEventRecords = Array.isArray(payload.corporate_events)
      ? payload.corporate_events
      : [];
    corporateEventRecords.forEach((record, eventIndex) => {
      if (!isPlainObject(record)) return;
      const eventData = isPlainObject(record.data) ? record.data : record;
      const counterparties = Array.isArray(eventData.counterparties)
        ? eventData.counterparties
        : [];
      counterparties.forEach((counterparty, counterpartyIndex) => {
        if (!isPlainObject(counterparty)) return;
        const counterpartyData = isPlainObject(counterparty.data)
          ? counterparty.data
          : counterparty;
        const individuals = Array.isArray(counterpartyData.individuals)
          ? counterpartyData.individuals
          : [];
        individuals.forEach((individual, individualIndex) => {
          pushPerson(
            individual,
            `request-counterparty-${payloadIndex}-${eventIndex}-${counterpartyIndex}-${individualIndex}`
          );
        });
      });
    });
  });

  return collected;
}

type ReviewCompanyManagementRole = {
  id?: number;
  job_title?: string;
};

type ReviewCompanyManagementRecord = {
  id?: number;
  Individual_text?: string;
  individuals_id?: number;
  Status?: string;
  job_titles_id?: ReviewCompanyManagementRole | ReviewCompanyManagementRole[];
};

type ReviewCompanyPayload = {
  Managmant_Roles_current?: ReviewCompanyManagementRecord[];
  Managmant_Roles_past?: ReviewCompanyManagementRecord[];
};

function getCompanyIndividualOptions(payload: unknown): ReviewManagementPerson[] {
  if (!isPlainObject(payload)) return [];
  const record = payload as ReviewCompanyPayload;

  const mapRoleTitles = (
    roles?: ReviewCompanyManagementRole | ReviewCompanyManagementRole[]
  ) => {
    const normalizedRoles = Array.isArray(roles)
      ? roles
      : roles && typeof roles === "object"
        ? [roles]
        : [];
    if (normalizedRoles.length === 0) return [""];
    const titles = normalizedRoles
      .map((role) => String(role?.job_title ?? "").trim())
      .filter(Boolean);
    return titles.length > 0 ? titles : [""];
  };

  const toPeople = (
    items: ReviewCompanyManagementRecord[] | undefined,
    fallbackStatus: "Current" | "Past"
  ) =>
    (Array.isArray(items) ? items : [])
      .map((person, index) =>
        createReviewManagementPerson({
          localId: `company-person-${fallbackStatus.toLowerCase()}-${person.id ?? index}`,
          name: String(person?.Individual_text ?? "").trim(),
          roles: mapRoleTitles(person?.job_titles_id),
          status:
            String(person?.Status ?? fallbackStatus).trim().toLowerCase() === "past"
              ? "Past"
              : "Current",
          individual_id:
            person?.individuals_id != null ? String(person.individuals_id) : undefined,
        })
      )
      .filter((person) => Boolean(person.name));

  return [...toPeople(record.Managmant_Roles_current, "Current"), ...toPeople(record.Managmant_Roles_past, "Past")];
}

function mergeReviewManagementPeople(
  ...groups: ReviewManagementPerson[][]
): ReviewManagementPerson[] {
  const merged: ReviewManagementPerson[] = [];
  const seen = new Set<string>();

  groups.flat().forEach((person) => {
    const key = `${person.individual_id || ""}::${person.name.trim().toLowerCase()}`;
    if (!person.name.trim() || seen.has(key)) return;
    seen.add(key);
    merged.push(person);
  });

  return merged;
}

function ReviewManagementPersonEditor({
  person,
  roleOptions,
  onChange,
  onRemove,
}: {
  person: ReviewManagementPerson;
  roleOptions: LookupOption[];
  onChange: (next: ReviewManagementPerson) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#dbeafe] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[#0f172a]">
          {person.name || "New individual"}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md border border-[#fecaca] bg-[#fff1f2] px-2.5 py-1 text-[11px] font-semibold text-[#9f1239] hover:bg-[#ffe4e6]"
        >
          Remove
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
            Name
          </label>
          <input
            value={person.name}
            onChange={(e) => onChange({ ...person, name: e.target.value })}
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
            Role / Position
          </div>
          <div className="space-y-2">
            {person.roles.map((role, index) => (
              <div key={`${person.localId}-role-${index}`} className="flex gap-2">
                <div className="flex-1">
                  {roleOptions.length > 0 ? (
                    <InlineSelect
                      value={role}
                      options={roleOptions}
                      onChange={(value) =>
                        onChange({
                          ...person,
                          roles: person.roles.map((item, itemIndex) =>
                            itemIndex === index ? value : item
                          ),
                        })
                      }
                    />
                  ) : (
                    <input
                      value={role}
                      onChange={(e) =>
                        onChange({
                          ...person,
                          roles: person.roles.map((item, itemIndex) =>
                            itemIndex === index ? e.target.value : item
                          ),
                        })
                      }
                      className="w-full rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
                    />
                  )}
                </div>
                {person.roles.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...person,
                        roles:
                          person.roles.length > 1
                            ? person.roles.filter((_, itemIndex) => itemIndex !== index)
                            : [""],
                      })
                    }
                    className="rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-1 text-xs font-semibold text-[#9f1239] hover:bg-[#ffe4e6]"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...person, roles: [...person.roles, ""] })}
              className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#1d4ed8] hover:bg-[#dbeafe]"
            >
              + Add role
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
            Status
          </label>
          <InlineSelect
            value={person.status}
            options={INDIVIDUAL_STATUS_OPTIONS}
            onChange={(value) => onChange({ ...person, status: value || "Current" })}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
            Location
          </label>
          <input
            value={person.location}
            onChange={(e) => onChange({ ...person, location: e.target.value })}
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
            Bio
          </label>
          <textarea
            value={person.bio}
            rows={3}
            onChange={(e) => onChange({ ...person, bio: e.target.value })}
            className="w-full resize-y rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
            LinkedIn URL
          </label>
          <input
            value={person.linkedin_url}
            onChange={(e) => onChange({ ...person, linkedin_url: e.target.value })}
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
            Company Profile URL
          </label>
          <input
            value={person.company_profile_url}
            onChange={(e) => onChange({ ...person, company_profile_url: e.target.value })}
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function ManagementTeamEditor({
  team,
  existingIndividuals,
  roleOptions,
  title = "Management team",
  onChange,
}: {
  team: ReviewManagementPerson[];
  existingIndividuals: ReviewManagementPerson[];
  roleOptions: LookupOption[];
  title?: string;
  onChange: (next: ReviewManagementPerson[]) => void;
}) {
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showLinkPicker) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setShowLinkPicker(false);
        setSearchTerm("");
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [showLinkPicker]);

  const linkedKeys = new Set(
    team.map((person) => `${person.individual_id || ""}::${person.name.toLowerCase()}`)
  );
  const filteredExisting = existingIndividuals.filter((person) => {
    const key = `${person.individual_id || ""}::${person.name.toLowerCase()}`;
    if (linkedKeys.has(key)) return false;
    if (!searchTerm.trim()) return true;
    const haystack = `${person.name} ${person.roles.join(" ")}`.toLowerCase();
    return haystack.includes(searchTerm.trim().toLowerCase());
  });

  return (
    <div className="mt-3 rounded-xl border border-[#bfdbfe] bg-[#f0f7ff] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4ed8]">
            {title}
          </div>
          <div className="mt-1 text-[11px] text-[#64748b]">
            Link people already present in this request, or add a new individual profile.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {existingIndividuals.length > 0 && (
            <div ref={pickerRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowLinkPicker((current) => !current);
                  setSearchTerm("");
                }}
                className="rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-xs font-semibold text-[#15803d] hover:bg-[#dcfce7]"
              >
                + Link existing
              </button>
              {showLinkPicker && (
                <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-[#cbd5e1] bg-white shadow-xl">
                  <div className="border-b border-[#f1f5f9] p-2">
                    <input
                      autoFocus
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search individuals..."
                      className="w-full rounded border border-[#e2e8f0] px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredExisting.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[#94a3b8]">No matching individuals</div>
                    ) : (
                      filteredExisting.map((person) => (
                        <button
                          key={`${person.individual_id || person.localId}`}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            onChange([
                              ...team,
                              createReviewManagementPerson({
                                ...person,
                                localId: `linked-person-${Date.now()}-${Math.random()
                                  .toString(36)
                                  .slice(2, 8)}`,
                              }),
                            ]);
                            setShowLinkPicker(false);
                            setSearchTerm("");
                          }}
                          className="block w-full border-t border-[#f1f5f9] px-3 py-2 text-left hover:bg-[#f8fafc]"
                        >
                          <div className="text-xs font-semibold text-[#0f172a]">{person.name}</div>
                          {person.roles.filter(Boolean).length > 0 && (
                            <div className="mt-0.5 text-[11px] text-[#64748b]">
                              {person.roles.filter(Boolean).join(", ")}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange([...team, createReviewManagementPerson()])}
            className="rounded-md border border-[#bfdbfe] bg-white px-3 py-1.5 text-xs font-semibold text-[#1d4ed8] hover:bg-[#eff6ff]"
          >
            + Add new individual
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {team.length > 0 ? (
          team.map((person) => (
            <ReviewManagementPersonEditor
              key={person.localId}
              person={person}
              roleOptions={roleOptions}
              onChange={(nextPerson) =>
                onChange(
                  team.map((item) => (item.localId === person.localId ? nextPerson : item))
                )
              }
              onRemove={() =>
                onChange(team.filter((item) => item.localId !== person.localId))
              }
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-[#cbd5e1] bg-white px-3 py-4 text-center text-xs text-[#64748b]">
            No management team members added yet.
          </div>
        )}
      </div>
    </div>
  );
}

function NewInvestorCompanyEditor({
  data,
  existingIndividuals,
  roleOptions,
  onChange,
}: {
  data: Record<string, unknown>;
  existingIndividuals: ReviewManagementPerson[];
  roleOptions: LookupOption[];
  onChange: (updated: Record<string, unknown>) => void;
}) {
  const { yearOptions, businessFocusOptions } = useLookup();
  const managementTeam = getManagementTeamFromData(data);
  const businessFocusSelectOptions =
    businessFocusOptions.length > 0
      ? businessFocusOptions
      : typeof data.primary_business_focus === "string" && data.primary_business_focus.trim()
        ? [
            {
              value: String(data.primary_business_focus_id ?? data.primary_business_focus),
              label: String(data.primary_business_focus),
            },
          ]
        : [];
  const businessFocusValue = String(
    data.primary_business_focus_id ?? data.primary_business_focus ?? ""
  );

  return (
    <>
      <InlineFieldEditor
        data={data}
        onChange={onChange}
        fieldLabels={INVESTOR_PROFILE_FIELDS}
        textareaKeys={new Set(["description"])}
        selectOptions={{
          year_founded: yearOptions,
        }}
      />
      <div className="mt-3 rounded-xl border border-[#bfdbfe] bg-[#f0f7ff] p-3">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
          Investment focus
        </label>
        <InlineSelect
          value={businessFocusValue}
          options={businessFocusSelectOptions}
          onChange={(value) => {
            const selected = businessFocusSelectOptions.find((option) => option.value === value);
            onChange({
              ...data,
              primary_business_focus_id: value,
              primary_business_focus: selected?.label ?? value,
            });
          }}
        />
      </div>
      <ManagementTeamEditor
        team={managementTeam}
        existingIndividuals={existingIndividuals}
        roleOptions={roleOptions}
        title="Investment team"
        onChange={(nextTeam) => onChange({ ...data, management_team: nextTeam })}
      />
    </>
  );
}

// Save / Cancel buttons for edit mode
function EditModeFooter({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="mt-3 flex gap-2">
      <button type="button" onClick={onSave}
        className="rounded-md bg-[#1d4ed8] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]">
        Save edits
      </button>
      <button type="button" onClick={onCancel}
        className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]">
        Cancel
      </button>
      <span className="self-center text-[11px] italic text-[#94a3b8]">
        Edits apply to the next approval action only
      </span>
    </div>
  );
}

const INDIVIDUAL_FIELDS: [string, string][] = [
  ["name", "Name"],
  ["status", "Status"],
  ["bio", "Bio"],
  ["linkedin_url", "LinkedIn URL"],
  ["location", "Location"],
];

/** Level 3 — Individual inside a counterparty */
function IndividualCard({
  individual,
  cpApprovedId,
}: {
  individual: Record<string, unknown>;
  cpApprovedId: string | number | null;
  requestId: number;
}) {
  const [status, setStatus] = useState<HierarchyApprovalStatus>("idle");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({ ...individual });

  const name = String(editData.name || "Unknown Person");
  const roles = Array.isArray(editData.roles)
    ? (editData.roles as string[]).filter(Boolean).join(", ")
    : "";
  const indStatus = typeof editData.status === "string" ? editData.status : null;
  const bio = typeof editData.bio === "string" ? editData.bio : null;
  const linkedin = typeof editData.linkedin_url === "string" ? editData.linkedin_url : null;
  const location = typeof editData.location === "string" ? editData.location : null;
  const isNew = individual.record_status === "new";

  const disabledReason = !cpApprovedId ? "Approve the Counterparty first" : undefined;

  const handleAction = (action: "approve" | "reject") => {
    setIsEditing(false);
    setStatus(action === "approve" ? "approved" : "rejected");
  };

  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[#0f172a]">{name}</span>
        {roles && <span className="text-[11px] text-[#64748b]">{roles}</span>}
        {indStatus && <span className="rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] text-[#166534]">{indStatus}</span>}
        {isNew && <span className="rounded-full bg-[#fef9c3] px-2 py-0.5 text-[10px] font-semibold text-[#854d0e]">new</span>}
      </div>
      {(bio || linkedin || location) && !isEditing && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[#64748b]">
          {bio && <span>Bio: {bio}</span>}
          {linkedin && <span>LI: {linkedin}</span>}
          {location && <span>Location: {location}</span>}
        </div>
      )}

      {isEditing && (
        <>
          <InlineFieldEditor
            data={editData}
            onChange={setEditData}
            fieldLabels={INDIVIDUAL_FIELDS}
            textareaKeys={new Set(["bio"])}
            selectOptions={{ status: INDIVIDUAL_STATUS_OPTIONS }}
          />
          <EditModeFooter onSave={() => setIsEditing(false)} onCancel={() => { setEditData({ ...individual }); setIsEditing(false); }} />
        </>
      )}

      {!isEditing && (
        <>
          <HierarchyActionBar
            label="Individual"
            status={status}
            disabledReason={disabledReason}
            onApprove={() => handleAction("approve")}
            onReject={() => handleAction("reject")}
            onEdit={() => setIsEditing(true)}
            isEditing={isEditing}
          />
          <ApprovalScopeNote text="UI only for now. This marks the Individual / Role as approved locally." />
        </>
      )}
    </div>
  );
}

const COUNTERPARTY_FIELDS: [string, string][] = [
  ["company_name", "Company Name"],
  ["role_type", "Role Type"],
  ["website_url", "Website URL"],
  ["linkedin_url", "LinkedIn URL"],
  ["press_release_url", "Press Release URL"],
];

/** Level 2 — Counterparty inside a CE */
function CounterpartyCard({
  counterparty,
  ceApprovedId,
  requestId,
}: {
  counterparty: Record<string, unknown>;
  ceApprovedId: string | number | null;
  requestId: number;
  parentCompanyId?: number;
}) {
  const { counterpartyRoleOptions } = useLookup();
  const [status, setStatus] = useState<HierarchyApprovalStatus>("idle");
  const [approvedId, setApprovedId] = useState<string | number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({ ...counterparty });

  const companyName = String(editData.company_name || "Unknown Company");
  const roleType = typeof editData.role_type === "string" ? editData.role_type : null;
  const website = typeof editData.website_url === "string" ? editData.website_url : null;
  const linkedin = typeof editData.linkedin_url === "string" ? editData.linkedin_url : null;
  const pressRelease = typeof editData.press_release_url === "string" ? editData.press_release_url : null;
  const isNewCo = counterparty.company_record_status === "new" || counterparty.is_new_company === true;
  const isNewRelationship = counterparty.record_status === "new";

  const individuals = Array.isArray(counterparty.individuals)
    ? (counterparty.individuals as unknown[]).filter(isPlainObject) as Record<string, unknown>[]
    : [];

  const disabledReason = !ceApprovedId ? "Approve the Corporate Event first" : undefined;

  const handleAction = (action: "approve" | "reject") => {
    setIsEditing(false);
    setStatus(action === "approve" ? "approved" : "rejected");
    if (action === "approve") {
      setApprovedId(
        String(
          editData.company_id ??
            counterparty.company_id ??
            counterparty.entity_id ??
            `local-counterparty-${requestId}-${counterparty.company_name ?? "item"}`
        )
      );
    }
  };

  return (
    <div className="ml-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[#0f172a]">{companyName}</span>
        {roleType && <span className="rounded-full border border-[#e2e8f0] bg-white px-2 py-0.5 text-[10px] text-[#475569]">{roleType}</span>}
        {isNewCo && <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">NEW COMPANY</span>}
        {!isNewCo && isNewRelationship && <span className="rounded-full bg-[#fef9c3] px-2 py-0.5 text-[10px] font-semibold text-[#854d0e]">new relationship</span>}
      </div>

      {(website || linkedin || pressRelease) && !isEditing && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[#64748b]">
          {website && <span>Web: {website}</span>}
          {linkedin && <span>LI: {linkedin}</span>}
          {pressRelease && <span>PR: {pressRelease}</span>}
        </div>
      )}

      {isEditing && (
        <>
          <InlineFieldEditor
            data={editData}
            onChange={setEditData}
            fieldLabels={COUNTERPARTY_FIELDS}
            selectOptions={counterpartyRoleOptions.length > 0 ? { role_type: counterpartyRoleOptions } : undefined}
          />
          <EditModeFooter onSave={() => setIsEditing(false)} onCancel={() => { setEditData({ ...counterparty }); setIsEditing(false); }} />
        </>
      )}

      {!isEditing && (
        <>
          <HierarchyActionBar
            label="Counterparty"
            status={status}
            disabledReason={disabledReason}
            onApprove={() => handleAction("approve")}
            onReject={() => handleAction("reject")}
            onEdit={() => setIsEditing(true)}
            isEditing={isEditing}
          />
          <ApprovalScopeNote text="UI only for now. This marks the Counterparty relationship as approved locally." />
        </>
      )}

      {/* Individuals */}
      {individuals.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">Individuals ({individuals.length})</div>
          {individuals.map((ind, idx) => (
            <IndividualCard key={String(ind.name ?? idx)} individual={ind} cpApprovedId={approvedId} requestId={requestId} />
          ))}
        </div>
      )}
    </div>
  );
}

const CE_FIELD_LABELS: [string, string][] = [
  ["title", "Title"],
  ["deal_type", "Deal Type"],
  ["deal_status", "Deal Status"],
  ["announcement_date", "Announcement Date"],
  ["closed_date", "Closed Date"],
  ["funding_stage", "Funding Stage"],
  ["amount_millions", "Amount (M)"],
  ["currency", "Currency"],
  ["source_url", "Source URL"],
  ["amount_source_url", "Amount Source URL"],
  ["long_description", "Description"],
];

/** Level 1 — Corporate Event card */
function CorporateEventCard({
  ceRecord,
  requestId,
  parentCompanyId,
}: {
  ceRecord: Record<string, unknown>;
  requestId: number;
  parentCompanyId?: number;
}) {
  const { currencyOptions } = useLookup();
  const [status, setStatus] = useState<HierarchyApprovalStatus>("idle");
  const [approvedId, setApprovedId] = useState<string | number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const originalCeData = isPlainObject(ceRecord.data)
    ? (ceRecord.data as Record<string, unknown>)
    : ceRecord;

  const [editData, setEditData] = useState<Record<string, unknown>>({ ...originalCeData });

  const entityId = String(ceRecord.entity_id ?? "");
  const isNew = ceRecord.record_status === "new";
  const title = String(editData.title || ceRecord.entity_id || "Untitled Event");

  const fieldRows = CE_FIELD_LABELS
    .map(([key, label]) => [label, String(editData[key] ?? "")] as [string, string])
    .filter(([, v]) => Boolean(v));

  const counterparties = Array.isArray(originalCeData.counterparties)
    ? (originalCeData.counterparties as unknown[]).filter(isPlainObject) as Record<string, unknown>[]
    : [];

  const handleAction = (action: "approve" | "reject") => {
    setIsEditing(false);
    setStatus(action === "approve" ? "approved" : "rejected");
    if (action === "approve") {
      setApprovedId(entityId || `local-ce-${requestId}`);
    }
  };

  const CE_EDIT_FIELDS: [string, string][] = CE_FIELD_LABELS.filter(([k]) => k !== "long_description");

  return (
    <div className="rounded-2xl border border-[#c7d7f4] bg-white p-5" style={{ borderLeft: "4px solid #3b82f6" }}>
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1d4ed8]">
              {isNew ? "NEW" : "UPDATED"} CORPORATE EVENT
            </span>
            <span className="text-base font-semibold text-[#0f172a]">{title}</span>
          </div>
          {entityId && <div className="mt-0.5 text-[11px] text-[#94a3b8]">ID: {entityId}</div>}
        </div>

        {!isEditing && (
          <HierarchyActionBar
            label="Corporate Event"
            status={status}
            onApprove={() => handleAction("approve")}
            onReject={() => handleAction("reject")}
            onEdit={() => setIsEditing(true)}
            isEditing={isEditing}
          />
        )}
      </div>

      {!isEditing && <ApprovalScopeNote text="UI only for now. Counterparties and Individuals can still be reviewed separately below." />}

      {/* Edit mode */}
      {isEditing && (
        <>
          <InlineFieldEditor
            data={editData}
            onChange={setEditData}
            fieldLabels={[...CE_EDIT_FIELDS, ["long_description", "Description"]]}
            textareaKeys={new Set(["long_description"])}
            selectOptions={{
              deal_type: DEAL_TYPE_OPTIONS,
              deal_status: DEAL_STATUS_OPTIONS,
              funding_stage: FUNDING_STAGE_OPTIONS,
              ...(currencyOptions.length > 0 ? { currency: currencyOptions } : {}),
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setIsEditing(false)}
              className="rounded-md bg-[#1d4ed8] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]">
              Save edits
            </button>
            <button type="button" onClick={() => { setEditData({ ...originalCeData }); setIsEditing(false); }}
              className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]">
              Cancel
            </button>
            <div className="flex flex-wrap items-center gap-2 self-center">
              <button type="button" onClick={() => handleAction("approve")}
                className="rounded-md border border-[#16a34a] bg-white px-3 py-1.5 text-xs font-semibold text-[#166534] hover:bg-[#f0fdf4]">
                Save &amp; Approve
              </button>
              <button type="button" onClick={() => handleAction("reject")}
                className="rounded-md border border-[#dc2626] bg-white px-3 py-1.5 text-xs font-semibold text-[#991b1b] hover:bg-[#fef2f2]">
                Save &amp; Reject
              </button>
            </div>
          </div>
          <span className="mt-1.5 block text-[11px] italic text-[#94a3b8]">Edits apply to the next approval action only</span>
        </>
      )}

      {/* CE field preview (when not editing) */}
      {!isEditing && fieldRows.length > 0 && (
        <div className="mt-4 grid gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 sm:grid-cols-2">
          {fieldRows.map(([label, value]) => (
            <div key={label} className="text-xs text-[#334155]">
              <span className="font-medium text-[#1e3a5f]">{label}:</span>{" "}{value}
            </div>
          ))}
        </div>
      )}

      {/* Counterparties */}
      {counterparties.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
            Counterparties ({counterparties.length})
          </div>
          {counterparties.map((cp, idx) => (
            <CounterpartyCard
              key={String(cp.company_id || cp.company_name || idx)}
              counterparty={cp}
              ceApprovedId={approvedId}
              requestId={requestId}
              parentCompanyId={parentCompanyId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders all CE records from the payload as hierarchical CorporateEventCards */
function CorporateEventsSection({
  ceRecords,
  requestId,
  parentCompanyId,
}: {
  ceRecords: Record<string, unknown>[];
  requestId: number;
  parentCompanyId?: number;
}) {
  if (ceRecords.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3b82f6]">
        C — Corporate Events
      </div>
      {ceRecords.map((ceRecord, idx) => {
        const ceData = isPlainObject(ceRecord.data) ? ceRecord.data as Record<string, unknown> : ceRecord;
        const key = String(ceRecord.entity_id ?? ceData.title ?? idx);
        return (
          <CorporateEventCard
            key={key}
            ceRecord={ceRecord}
            requestId={requestId}
            parentCompanyId={parentCompanyId}
          />
        );
      })}
    </div>
  );
}

/** Map field path segment → lookup key in LookupData for DiffEntryCard */
const DIFF_FIELD_SELECT_MAP: Record<string, keyof LookupData> = {
  ownership: "ownershipOptions",
  year_founded: "yearOptions",
  transaction_status: "transactionStatusOptions",
};

function DiffEntryCard({
  entry,
  requestId,
  decisions,
  onDecide,
  serverRejectBaselines,
}: {
  entry: DiffEntry;
  requestId: number;
  decisions: Record<string, DecisionState>;
  onDecide: (key: string, value: DecisionState) => void;
  serverRejectBaselines?: Record<string, string>;
}) {
  const lookup = useLookup();
  const decisionKey = `${requestId}:${entry.key}`;
  const suffix = entry.key;
  const decision = decisions[decisionKey];
  const contextPath = renderContextPath(entry.path);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState<string>(
    typeof entry.newValue === "string" || typeof entry.newValue === "number"
      ? String(entry.newValue)
      : ""
  );
  const isPrimitive =
    typeof entry.newValue === "string" ||
    typeof entry.newValue === "number" ||
    entry.newValue == null;

  const fieldKey = entry.path[entry.path.length - 1] ?? "";
  const selectLookupKey = DIFF_FIELD_SELECT_MAP[fieldKey];
  const selectOpts: LookupOption[] | undefined = selectLookupKey
    ? (lookup[selectLookupKey] as LookupOption[])
    : undefined;

  const baselineFp = serverRejectBaselines?.[suffix];
  const coerceEditedForBaseline = (edited: string, newVal: unknown): unknown => {
    if (newVal == null) return edited.trim() === "" ? null : edited;
    if (typeof newVal === "number") {
      const n = Number(String(edited).trim());
      return Number.isFinite(n) ? n : edited;
    }
    if (typeof newVal === "boolean") {
      const t = String(edited).trim().toLowerCase();
      if (t === "true") return true;
      if (t === "false") return false;
    }
    return edited;
  };
  const currentProposalFingerprint = isPrimitive
    ? stableStringifyForReviewBaseline(coerceEditedForBaseline(editedValue, entry.newValue))
    : stableStringifyForReviewBaseline(entry.newValue);
  const primitiveBaselineLocked =
    Boolean(baselineFp != null && isPrimitive && currentProposalFingerprint === baselineFp);
  const serverRejectedHighlight = baselineFp != null;
  const gatedToolbar = primitiveBaselineLocked && !isEditing;

  return (
    <div
      className={`rounded-2xl border p-5 ${
        serverRejectedHighlight
          ? "border-rose-300 bg-rose-50/50 ring-1 ring-rose-200"
          : "border-[#dbe3f0] bg-white"
      }`}
    >
      {serverRejectedHighlight && gatedToolbar && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-100/80 px-3 py-2 text-[11px] font-medium text-rose-950">
          Rejected in review — edit the proposed value to enable Accept and Reject.
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[#0f172a]">{renderPath(entry.path)}</div>
          {contextPath && (
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[#64748b]">{contextPath}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!gatedToolbar ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecide(decisionKey, decision === "approve" ? undefined : "approve");
                }}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  decision === "approve"
                    ? "bg-emerald-600 text-white"
                    : "border border-[#16a34a] bg-white text-[#166534] hover:bg-[#f0fdf4]"
                }`}
              >
                Accept
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecide(decisionKey, decision === "reject" ? undefined : "reject");
                }}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  decision === "reject"
                    ? "bg-rose-600 text-white"
                    : "border border-[#dc2626] bg-white text-[#991b1b] hover:bg-[#fef2f2]"
                }`}
              >
                Reject
              </button>
              {isPrimitive && !isEditing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="cursor-pointer rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]"
                >
                  ✏️ Edit
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecide(decisionKey, undefined);
                }}
                className="cursor-pointer rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]"
              >
                Clear
              </button>
            </>
          ) : (
            isPrimitive && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="cursor-pointer rounded-md border border-[#475569] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
              >
                ✏️ Edit
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] p-4">
          <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Current value</div>
          {renderReadableValue(entry.oldValue, "No current value")}
        </div>
        <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[#2563eb]">
            <span>Proposed value</span>
            {isEditing && <span className="normal-case text-[#94a3b8]">editing</span>}
          </div>
          {isEditing ? (
            <>
              {selectOpts && selectOpts.length > 0 ? (
                <InlineSelect
                  value={editedValue}
                  options={selectOpts}
                  onChange={setEditedValue}
                />
              ) : (
                <input
                  value={editedValue}
                  onChange={(e) => setEditedValue(e.target.value)}
                  className="w-full rounded-lg border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#334155] focus:outline-none"
                  autoFocus
                />
              )}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setIsEditing(false)}
                  className="rounded-md bg-[#1d4ed8] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#1e40af]">
                  Save
                </button>
                <button type="button" onClick={() => { setEditedValue(String(entry.newValue ?? "")); setIsEditing(false); }}
                  className="rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-[11px] text-[#475569]">
                  Reset
                </button>
              </div>
            </>
          ) : (
            renderReadableValue(
              editedValue !== String(entry.newValue ?? "") ? editedValue : entry.newValue,
              "No proposed value"
            )
          )}
          {editedValue !== String(entry.newValue ?? "") && !isEditing && (
            <div className="mt-1 text-[10px] italic text-[#f59e0b]">Modified by reviewer</div>
          )}
        </div>
      </div>

      {!gatedToolbar && decision && !(primitiveBaselineLocked && decision === "reject") && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#64748b]">
            {decision === "approve" ? "Marked approve locally" : "Marked reject locally"}
          </span>
          <span className="text-[11px] italic text-[#94a3b8]">· local review mark only</span>
        </div>
      )}
    </div>
  );
}

function companyName(row: FinMetricsCompanyItem): string {
  return typeof row.company_name === "number"
    ? String(row.company_name)
    : row.company_name;
}

// ─────────────────────────────────────────────────────────────
// "Accept new profile" infrastructure
// ─────────────────────────────────────────────────────────────

type NewEntityEntry = {
  id: string;
  entityType: string;
  label: string;
  context: string;
  profile: Record<string, unknown>;
  /** The full entity data (for CEs / management / subsidiaries that are record_status: "new") */
  fullData?: Record<string, unknown>;
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  company: "Company",
  corporate_event: "Corporate Event",
  management_person: "Management Person",
  subsidiary: "Subsidiary",
  counterparty: "Counterparty Company",
};

function extractNewEntityEntries(
  newPayload: Record<string, unknown>
): NewEntityEntry[] {
  const entries: NewEntityEntry[] = [];

  // Helper — scan an entity-record array for record_status: "new"
  // If the record itself has is_new_company: true, skip the entity-level card
  // (the onEachNew callback will push the company-profile card instead).
  function scanEntityArray(
    records: unknown,
    entityType: string,
    contextLabel: string,
    getLabel: (data: Record<string, unknown>) => string,
    onEachNew?: (data: Record<string, unknown>, label: string, entityId: string) => void
  ) {
    if (!Array.isArray(records)) return;
    records.forEach((record, index) => {
      if (!isPlainObject(record)) return;
      const data = isPlainObject(record.data) ? (record.data as Record<string, unknown>) : {};
      if (record.record_status === "new") {
        const label = getLabel(data);
        const entityId = String(record.entity_id ?? index);
        entries.push({
          id: `${entityType}-${entityId}`,
          entityType,
          label,
          context: contextLabel,
          profile: data,
          fullData: data,
        });
        onEachNew?.(data, label, entityId);
      }
    });
  }

  // Note: Corporate Events are now rendered directly from payload in Section C
  // (CorporateEventsSection / CorporateEventCard), not via this entries list.
  // Counterparty company profiles inside CEs are handled within the CE card.

  // 1. New Management People
  scanEntityArray(
    newPayload.management_people,
    "management_person",
    "Management",
    (data) => String(data.name || "Unknown Person")
  );

  // 3. New Subsidiaries (and new companies behind them)
  scanEntityArray(
    newPayload.subsidiaries,
    "subsidiary",
    "Subsidiaries",
    (data) => String(data.name || "Unknown Subsidiary")
  );

  // 4. New investor companies from investors_diff
  const companyData = getCompanyData(newPayload);
  if (companyData) {
    const collectNewCompaniesFromRelationDiff = (
      diffObj: Record<string, unknown> | null,
      context: string,
      idPrefix: string
    ) => {
      if (!diffObj || !Array.isArray(diffObj.added)) return;
      diffObj.added.forEach((inv: unknown, index: number) => {
        if (!isPlainObject(inv)) return;
        if (
          (inv.company_record_status === "new" || inv.is_new_company === true) &&
          isPlainObject(inv.new_company_profile)
        ) {
          entries.push({
            id: `${idPrefix}-${String(inv.company_id || index)}`,
            entityType: "company",
            label: String(inv.company_name || context),
            context,
            profile: inv.new_company_profile as Record<string, unknown>,
          });
        }
      });
    };

    const investorsDiff = isPlainObject(companyData.investors_diff)
      ? (companyData.investors_diff as Record<string, unknown>)
      : null;
    collectNewCompaniesFromRelationDiff(investorsDiff, "New Investor", "investor-company");

    const peersDiff = isPlainObject(companyData.peers_competitors_diff)
      ? (companyData.peers_competitors_diff as Record<string, unknown>)
      : null;
    collectNewCompaniesFromRelationDiff(
      peersDiff,
      "New Peer / Competitor",
      "peer-competitor-company"
    );

    const acquirersDiff = isPlainObject(companyData.potential_acquirers_diff)
      ? (companyData.potential_acquirers_diff as Record<string, unknown>)
      : null;
    collectNewCompaniesFromRelationDiff(
      acquirersDiff,
      "New Potential Acquirer",
      "potential-acquirer-company"
    );

    const targetsDiff = isPlainObject(companyData.acquisition_targets_diff)
      ? (companyData.acquisition_targets_diff as Record<string, unknown>)
      : null;
    collectNewCompaniesFromRelationDiff(
      targetsDiff,
      "New Acquisition Target",
      "acquisition-target-company"
    );

    // 5. New parent company
    const parentCompany = isPlainObject(companyData.parent_company)
      ? (companyData.parent_company as Record<string, unknown>)
      : null;
    if (
      parentCompany &&
      (parentCompany.company_record_status === "new" || parentCompany.is_new_company === true) &&
      isPlainObject(parentCompany.new_company_profile)
    ) {
      entries.push({
        id: "parent-company-new",
        entityType: "company",
        label: String(parentCompany.company_name || "New Parent Company"),
        context: "New Parent Company",
        profile: parentCompany.new_company_profile as Record<string, unknown>,
      });
    }
  }

  return entries;
}

// Internal metadata keys — never shown in profile preview grids
const PROFILE_SKIP_KEYS = new Set([
  "is_new_company", "new_company_profile", "company_record_status",
  "record_status", "change_action", "company_id", "entity_id",
  "parent_entity_id", "parent_entity_type", "data_type",
]);

function flatProfileRows(profile: Record<string, unknown>): [string, string][] {
  return Object.entries(profile)
    .filter(([k, v]) =>
      !PROFILE_SKIP_KEYS.has(k) &&
      v !== null &&
      v !== undefined &&
      v !== "" &&
      typeof v !== "boolean" &&
      typeof v !== "object"
    )
    .slice(0, 8)
    .map(([k, v]) => [k.replace(/_/g, " "), String(v)]);
}

// Generic flat field labels for well-known entity types (used by InlineFieldEditor)
const COMPANY_PROFILE_FIELDS: [string, string][] = [
  ["name", "Name"],
  ["website", "Website"],
  ["description", "Description"],
  ["year_founded", "Year Founded"],
  ["ownership", "Ownership"],
  ["hq", "HQ Location"],
];
const INVESTOR_PROFILE_FIELDS: [string, string][] = [
  ["name", "Name"],
  ["website", "Website"],
  ["description", "Description"],
  ["year_founded", "Year Founded"],
  ["hq", "HQ Location"],
];
const MANAGEMENT_PERSON_FIELDS: [string, string][] = [
  ["name", "Name"],
  ["status", "Status"],
  ["bio", "Bio"],
  ["linkedin_url", "LinkedIn URL"],
  ["location", "Location"],
];
const SUBSIDIARY_FIELDS: [string, string][] = [
  ["name", "Name"],
  ["description", "Description"],
  ["linkedin_members", "LinkedIn Members"],
  ["country", "Country"],
];

function NewSubsidiaryEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}) {
  const { ownershipOptions, yearOptions } = useLookup();
  const newCompanyProfile = isPlainObject(data.new_company_profile)
    ? (data.new_company_profile as Record<string, unknown>)
    : null;

  return (
    <>
      <InlineFieldEditor
        data={data}
        onChange={onChange}
        fieldLabels={SUBSIDIARY_FIELDS}
        textareaKeys={new Set(["description"])}
      />
      {newCompanyProfile && (
        <div className="mt-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4ed8]">
            Subsidiary company profile
          </div>
          <InlineFieldEditor
            data={newCompanyProfile}
            onChange={(updatedProfile) =>
              onChange({ ...data, new_company_profile: updatedProfile })
            }
            fieldLabels={COMPANY_PROFILE_FIELDS}
            textareaKeys={new Set(["description"])}
            selectOptions={{
              ownership: ownershipOptions,
              year_founded: yearOptions,
            }}
          />
        </div>
      )}
    </>
  );
}

function getEntityEditFields(entityType: string): { fields: [string, string][]; textareas?: Set<string> } {
  switch (entityType) {
    case "company": return { fields: COMPANY_PROFILE_FIELDS, textareas: new Set(["description"]) };
    case "management_person": return { fields: MANAGEMENT_PERSON_FIELDS, textareas: new Set(["bio"]) };
    case "subsidiary": return { fields: SUBSIDIARY_FIELDS, textareas: new Set(["description"]) };
    default: return { fields: [] };
  }
}

function NewEntityAcceptCard({
  entry,
  existingIndividuals,
}: {
  entry: NewEntityEntry;
  requestId: number;
  parentCompanyId?: number;
  existingIndividuals: ReviewManagementPerson[];
}) {
  const { ownershipOptions, yearOptions, jobTitleOptions } = useLookup();
  const [status, setStatus] = useState<
    "idle" | "approving" | "rejecting" | "approved" | "rejected" | "error"
  >("idle");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({ ...(entry.fullData ?? entry.profile) });

  const entityLabel = ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType;
  const profileRows = flatProfileRows(editData);
  const busy = status === "approving" || status === "rejecting";
  const { fields: editFields, textareas: textareaKeys } = getEntityEditFields(entry.entityType);
  const hasEditFields = editFields.length > 0;
  const isNewInvestorCompany =
    entry.entityType === "company" && entry.context === "New Investor";
  const isNewSubsidiary = entry.entityType === "subsidiary";
  const managementTeam = isNewInvestorCompany ? getManagementTeamFromData(editData) : [];

  const handleAction = (action: "approve" | "reject") => {
    setIsEditing(false);
    setStatus(action === "approve" ? "approved" : "rejected");
  };

  return (
    <div
      className="rounded-2xl border border-[#dbeafe] bg-white p-5"
      style={{ borderLeft: "4px solid #3b82f6" }}
    >
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1d4ed8]">
              NEW {entityLabel}
            </span>
            <span className="text-base font-semibold text-[#0f172a]">{entry.label}</span>
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
            {entry.context}
          </div>
        </div>

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex flex-wrap items-center gap-2">
            {status === "approved" && (
              <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-xs font-semibold text-[#166534]">Approved ✓</span>
            )}
            {status === "rejected" && (
              <span className="rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 text-xs font-semibold text-[#991b1b]">Rejected ✗</span>
            )}
            {status !== "approved" && status !== "rejected" && (
              <>
                <button type="button" onClick={() => handleAction("approve")} disabled={busy}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${status === "approving" ? "bg-emerald-600 text-white" : "border border-[#16a34a] bg-white text-[#166534] hover:bg-[#f0fdf4]"}`}>
                  {status === "approving" ? "Approving…" : `Approve ${entityLabel}`}
                </button>
                <button type="button" onClick={() => handleAction("reject")} disabled={busy}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${status === "rejecting" ? "bg-rose-600 text-white" : "border border-[#dc2626] bg-white text-[#991b1b] hover:bg-[#fef2f2]"}`}>
                  {status === "rejecting" ? "Rejecting…" : `Reject ${entityLabel}`}
                </button>
              </>
            )}
            {hasEditFields && !busy && (
              <button type="button" onClick={() => setIsEditing(true)}
                className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]">
                ✏️ Edit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit mode */}
      {isEditing && (
        <>
          {isNewInvestorCompany ? (
            <NewInvestorCompanyEditor
              data={editData}
              onChange={setEditData}
              existingIndividuals={existingIndividuals}
              roleOptions={jobTitleOptions}
            />
          ) : isNewSubsidiary ? (
            <NewSubsidiaryEditor data={editData} onChange={setEditData} />
          ) : entry.entityType === "management_person" ? (
            <ReviewManagementPersonEditor
              person={
                normalizeReviewManagementPerson(editData, `edit-${entry.id}`) ??
                createReviewManagementPerson({ localId: `edit-${entry.id}` })
              }
              roleOptions={jobTitleOptions}
              onChange={(nextPerson) =>
                setEditData({
                  ...editData,
                  name: nextPerson.name,
                  roles: nextPerson.roles.filter(Boolean),
                  status: nextPerson.status,
                  location: nextPerson.location,
                  bio: nextPerson.bio,
                  linkedin_url: nextPerson.linkedin_url,
                  company_profile_url: nextPerson.company_profile_url,
                })
              }
              onRemove={() => {}}
            />
          ) : (
            <InlineFieldEditor
              data={editData}
              onChange={setEditData}
              fieldLabels={editFields}
              textareaKeys={textareaKeys}
              selectOptions={
                entry.entityType === "company" || entry.entityType === "subsidiary"
                  ? {
                      ownership: ownershipOptions,
                      year_founded: yearOptions,
                    }
                  : undefined
              }
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => handleAction("approve")}
              className="rounded-md border border-[#16a34a] bg-white px-3 py-1.5 text-xs font-semibold text-[#166534] hover:bg-[#f0fdf4]">
              Save &amp; Approve {entityLabel}
            </button>
            <button type="button" onClick={() => handleAction("reject")}
              className="rounded-md border border-[#dc2626] bg-white px-3 py-1.5 text-xs font-semibold text-[#991b1b] hover:bg-[#fef2f2]">
              Save &amp; Reject {entityLabel}
            </button>
            <button type="button" onClick={() => setIsEditing(false)}
              className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f8fafc]">
              Cancel
            </button>
          </div>
          <span className="mt-1.5 block text-[11px] italic text-[#94a3b8]">Edits apply to the next approval action</span>
        </>
      )}

      {/* Profile data (view mode) */}
      {!isEditing && (
        entry.entityType === "corporate_event" ? (
          <CorporateEventProfilePanel data={editData} />
        ) : entry.entityType === "management_person" ? (() => {
          const person = normalizeReviewManagementPerson(editData, `view-${entry.id}`);
          if (!person) return null;
          const roles = person.roles.filter(Boolean);
          const details = [
            roles.length > 0 ? roles.join(", ") : null,
            person.location || null,
          ].filter(Boolean);
          return (
            <div className="mt-2 space-y-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-xs text-[#334155]">
                <span className="font-medium text-[#1e3a5f]">Name:</span>{" "}{person.name || "—"}
              </div>
              {roles.length > 0 && (
                <div className="text-xs text-[#334155]">
                  <span className="font-medium text-[#1e3a5f]">Role(s):</span>{" "}
                  {roles.join(", ")}
                </div>
              )}
              {person.status && (
                <div className="text-xs text-[#334155]">
                  <span className="font-medium text-[#1e3a5f]">Status:</span>{" "}{person.status}
                </div>
              )}
              {person.location && (
                <div className="text-xs text-[#334155]">
                  <span className="font-medium text-[#1e3a5f]">Location:</span>{" "}{person.location}
                </div>
              )}
              {person.bio && (
                <div className="text-xs text-[#334155]">
                  <span className="font-medium text-[#1e3a5f]">Bio:</span>{" "}{person.bio}
                </div>
              )}
              {person.linkedin_url && (
                <div className="text-xs text-[#334155]">
                  <span className="font-medium text-[#1e3a5f]">LinkedIn:</span>{" "}{person.linkedin_url}
                </div>
              )}
              {details.length === 0 && !person.name && (
                <div className="text-xs text-[#94a3b8]">No details</div>
              )}
            </div>
          );
        })() : profileRows.length > 0 ? (
          <div className="grid gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 sm:grid-cols-2">
            {profileRows.map(([label, value]) => (
              <div key={label} className="text-xs text-[#334155]">
                <span className="font-medium capitalize text-[#1e3a5f]">{label}:</span>{" "}{value}
              </div>
            ))}
          </div>
        ) : null
      )}
      {!isEditing &&
        isNewSubsidiary &&
        isPlainObject(editData.new_company_profile) && (
          <NewCompanyProfilePanel
            profile={editData.new_company_profile as NewCompanyProfileData}
          />
        )}
      {!isEditing && isNewInvestorCompany && managementTeam.length > 0 && (
        <div className="mt-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
            Investment team ({managementTeam.length})
          </div>
          <div className="space-y-1.5">
            {managementTeam.map((person) => (
              <div key={person.localId} className="text-xs text-[#334155]">
                <span className="font-medium text-[#1e3a5f]">{person.name || "Unnamed"}:</span>{" "}
                {person.roles.filter(Boolean).join(", ") || "No role"}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// Paths that are handled by dedicated cards — strip from the generic collectDiffs output
const DEDICATED_CARD_PATHS = new Set([
  "investors",
  "investors_diff",
  "peers_competitors",
  "peers_competitors_diff",
  "potential_acquirers",
  "potential_acquirers_diff",
  "acquisition_targets",
  "acquisition_targets_diff",
  "primary_sectors",
  "secondary_sectors",
  "primary_sectors_diff",
  "secondary_sectors_diff",
  "parent_company",
  "new_company_profile",
  // CE hierarchy is rendered directly from payload, not from collectDiffs
  "corporate_events",
  // Array attribute fields with dedicated diff cards
  "product_type",
  "data_collection_method",
  "revenue_model",
]);

function PendingRequestBlock({
  request,
  decisions,
  onDecide,
  serverRejectBaselines,
}: {
  request: ChangeRequestItem;
  decisions: Record<string, DecisionState>;
  onDecide: (key: string, value: DecisionState) => void;
  serverRejectBaselines?: Record<string, string>;
}) {
  const { primarySectorOptions, secondarySectorOptions, companyIndividuals } = useLookup();
  const oldPayload = useMemo(() => getRequestOldPayload(request), [request]);
  const newPayload = useMemo(() => getRequestNewPayload(request), [request]);

  // ── Sector diffs ───────────────────────────────────────────
  const primarySectorDiff = useMemo(
    () => getCompanyDiffList(newPayload, "primary_sectors_diff"),
    [newPayload]
  );
  const secondarySectorDiff = useMemo(
    () => getCompanyDiffList(newPayload, "secondary_sectors_diff"),
    [newPayload]
  );
  const oldPrimarySectors = useMemo(
    () => getOldSectorList(oldPayload, "primary_sectors"),
    [oldPayload]
  );
  const oldSecondarySectors = useMemo(
    () => getOldSectorList(oldPayload, "secondary_sectors"),
    [oldPayload]
  );

  // ── Investor / parent company diffs ────────────────────────
  const investorDiff = useMemo(
    () => getCompanyDiffList(newPayload, "investors_diff"),
    [newPayload]
  );
  const visibleInvestorDiff = useMemo(
    () => visibleRelationCompanyDiff(investorDiff),
    [investorDiff]
  );
  const oldInvestors = useMemo(() => getOldInvestors(oldPayload), [oldPayload]);

  const peersDiff = useMemo(
    () => getCompanyDiffList(newPayload, "peers_competitors_diff"),
    [newPayload]
  );
  const visiblePeersDiff = useMemo(() => visibleRelationCompanyDiff(peersDiff), [peersDiff]);
  const oldPeersCompetitors = useMemo(
    () => getOldCompanyRelationList(oldPayload, "peers_competitors"),
    [oldPayload]
  );

  const potentialAcquirersDiff = useMemo(
    () => getCompanyDiffList(newPayload, "potential_acquirers_diff"),
    [newPayload]
  );
  const visiblePotentialAcquirersDiff = useMemo(
    () => visibleRelationCompanyDiff(potentialAcquirersDiff),
    [potentialAcquirersDiff]
  );
  const oldPotentialAcquirers = useMemo(
    () => getOldCompanyRelationList(oldPayload, "potential_acquirers"),
    [oldPayload]
  );

  const acquisitionTargetsDiff = useMemo(
    () => getCompanyDiffList(newPayload, "acquisition_targets_diff"),
    [newPayload]
  );
  const visibleAcquisitionTargetsDiff = useMemo(
    () => visibleRelationCompanyDiff(acquisitionTargetsDiff),
    [acquisitionTargetsDiff]
  );
  const oldAcquisitionTargets = useMemo(
    () => getOldCompanyRelationList(oldPayload, "acquisition_targets"),
    [oldPayload]
  );

  const parentCompanyChange = useMemo(
    () => getParentCompanyChange(oldPayload, newPayload),
    [oldPayload, newPayload]
  );

  // ── Product Type / Data Collection / Revenue Model diffs ───
  const oldProductType = useMemo(() => getCompanyArrayField(oldPayload, "product_type"), [oldPayload]);
  const newProductType = useMemo(() => getCompanyArrayField(newPayload, "product_type"), [newPayload]);
  const hasProductTypeChange = useMemo(
    () => JSON.stringify(oldProductType) !== JSON.stringify(newProductType) &&
      (oldProductType.length > 0 || newProductType.length > 0),
    [oldProductType, newProductType]
  );

  const oldDataCollection = useMemo(() => getCompanyArrayField(oldPayload, "data_collection_method"), [oldPayload]);
  const newDataCollection = useMemo(() => getCompanyArrayField(newPayload, "data_collection_method"), [newPayload]);
  const hasDataCollectionChange = useMemo(
    () => JSON.stringify(oldDataCollection) !== JSON.stringify(newDataCollection) &&
      (oldDataCollection.length > 0 || newDataCollection.length > 0),
    [oldDataCollection, newDataCollection]
  );

  const oldRevenueModel = useMemo(() => getCompanyArrayField(oldPayload, "revenue_model"), [oldPayload]);
  const newRevenueModel = useMemo(() => getCompanyArrayField(newPayload, "revenue_model"), [newPayload]);
  const hasRevenueModelChange = useMemo(
    () => JSON.stringify(oldRevenueModel) !== JSON.stringify(newRevenueModel) &&
      (oldRevenueModel.length > 0 || newRevenueModel.length > 0),
    [oldRevenueModel, newRevenueModel]
  );

  // ── New entity entries (Section A) ─────────────────────────
  // extractNewEntityEntries now skips CEs (they live in Section C).
  const newEntityEntries = useMemo(
    () => extractNewEntityEntries(newPayload),
    [newPayload]
  );
  const requestIndividualOptions = useMemo(
    () => getRequestIndividualOptions([oldPayload, newPayload]),
    [oldPayload, newPayload]
  );
  const availableIndividualOptions = useMemo(
    () => mergeReviewManagementPeople(companyIndividuals, requestIndividualOptions),
    [companyIndividuals, requestIndividualOptions]
  );

  // Labels of new non-CE entities whose field diffs should be suppressed
  const newEntityLabels = useMemo(
    () =>
      new Set(
        newEntityEntries
          .filter((e) => ["management_person", "subsidiary"].includes(e.entityType))
          .map((e) => e.label)
      ),
    [newEntityEntries]
  );

  // ── Generic field diffs (Section B remainder) ──────────────
  const diffEntries = useMemo(() => {
    const isEmpty = (v: unknown) => v == null || v === "";
    const all = collectDiffs(oldPayload, newPayload);
    return all.filter((entry) => {
      const terminal = entry.path[entry.path.length - 1];
      if (PATH_NOISY_SEGMENTS.has(terminal)) return false;
      if (isEmpty(entry.oldValue) && isEmpty(entry.newValue)) return false;
      if (entry.path.some((seg) => DEDICATED_CARD_PATHS.has(seg))) return false;
      // Suppress field-level diffs for new management/subsidiary entities
      for (const arrayKey of ["management_people", "subsidiaries"]) {
        const idx = entry.path.indexOf(arrayKey);
        if (idx !== -1 && newEntityLabels.has(entry.path[idx + 1] ?? "")) return false;
      }
      return (
        !entry.path.includes("approved") &&
        !entry.path.includes("reviewed_by") &&
        !entry.path.includes("submitted_by")
      );
    });
  }, [oldPayload, newPayload, newEntityLabels]);

  // ── Corporate Events (Section C) — parse directly from payload ─
  const ceRecords = useMemo(() => {
    const raw = newPayload.corporate_events;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isPlainObject) as Record<string, unknown>[];
  }, [newPayload]);

  // ── Visibility flags ───────────────────────────────────────
  const hasSectionA = newEntityEntries.length > 0;
  const hasSectionB =
    primarySectorDiff != null ||
    secondarySectorDiff != null ||
    visibleInvestorDiff != null ||
    visiblePeersDiff != null ||
    visiblePotentialAcquirersDiff != null ||
    visibleAcquisitionTargetsDiff != null ||
    parentCompanyChange != null ||
    hasProductTypeChange ||
    hasDataCollectionChange ||
    hasRevenueModelChange ||
    diffEntries.length > 0;
  const hasSectionC = ceRecords.length > 0;
  const hasAnything = hasSectionA || hasSectionB || hasSectionC;

  const isReadOnly = isAlreadyReviewedStatus(request.status);

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      {/* Request header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Request #{request.id}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {(request.entity_type || "change request")} submitted by{" "}
            {getRequestSubmittedBy(request)} on {formatDate(request.created_at)}
          </div>
        </div>
        {isReadOnly ? (
          <div className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-700">
            {(request.status || "Approved").trim()}
          </div>
        ) : (
          <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-600">
            Pending review
          </div>
        )}
      </div>

      {isReadOnly && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          This request has already been reviewed and cannot be modified.
        </div>
      )}

      {request.documents && request.documents.length > 0 && (
        <div className="mb-5">
          <RequestDocumentsSection documents={request.documents} />
        </div>
      )}

      {!hasAnything ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
          No pending changes were found in this request.
        </div>
      ) : (
        <div className={`space-y-6${isReadOnly ? " pointer-events-none select-none opacity-50" : ""}`}>

          {/* ── Section A: New Company Profiles ─────────────────────── */}
          {hasSectionA && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3b82f6]">
                  A — New Company Profiles
                </span>
                <span className="text-[11px] text-[#64748b]">
                  Approve or reject each profile independently
                </span>
              </div>
              {newEntityEntries.map((entry) => (
                <NewEntityAcceptCard
                  key={entry.id}
                  entry={entry}
                  requestId={request.id}
                  parentCompanyId={request.new_company_id}
                  existingIndividuals={availableIndividualOptions}
                />
              ))}
            </div>
          )}

          {/* ── Section B: Company Data Changes ─────────────────────── */}
          {hasSectionB && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f59e0b]">
                  B — Company Data Changes
                </span>
                <span className="text-[11px] text-[#64748b]">
                  Mark each change as accepted or rejected
                </span>
              </div>
              {primarySectorDiff && (
                <SectorDiffCard
                  title="Primary Sectors"
                  diff={primarySectorDiff}
                  existingList={oldPrimarySectors}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                  sectorOptions={primarySectorOptions}
                />
              )}
              {secondarySectorDiff && (
                <SectorDiffCard
                  title="Secondary Sectors"
                  diff={secondarySectorDiff}
                  existingList={oldSecondarySectors}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                  sectorOptions={secondarySectorOptions}
                />
              )}
              {visibleInvestorDiff && (
                <InvestorDiffCard
                  diff={visibleInvestorDiff}
                  existingInvestors={oldInvestors}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                />
              )}
              {visiblePeersDiff && (
                <InvestorDiffCard
                  diff={visiblePeersDiff}
                  existingInvestors={oldPeersCompetitors}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                  title="Peers & Competitors"
                  decisionSuffix="peers_competitors_diff"
                  emptyLabel="No peers or competitors"
                />
              )}
              {visiblePotentialAcquirersDiff && (
                <InvestorDiffCard
                  diff={visiblePotentialAcquirersDiff}
                  existingInvestors={oldPotentialAcquirers}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                  title="Potential Acquirers"
                  decisionSuffix="potential_acquirers_diff"
                  emptyLabel="No potential acquirers"
                />
              )}
              {visibleAcquisitionTargetsDiff && (
                <InvestorDiffCard
                  diff={visibleAcquisitionTargetsDiff}
                  existingInvestors={oldAcquisitionTargets}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                  title="Acquisition Targets"
                  decisionSuffix="acquisition_targets_diff"
                  emptyLabel="No acquisition targets"
                />
              )}
              {parentCompanyChange && (
                <ParentCompanyCard
                  change={parentCompanyChange}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                />
              )}
              {hasProductTypeChange && (
                <ArrayFieldDiffCard
                  title="Product Type"
                  columns={[
                    { key: "Product_Type", label: "Type" },
                    { key: "pc_of_revenues", label: "% of Revenue" },
                  ]}
                  oldRows={oldProductType}
                  newRows={newProductType}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                />
              )}
              {hasDataCollectionChange && (
                <ArrayFieldDiffCard
                  title="Data Collection Method"
                  columns={[
                    { key: "Data_Collection_Method", label: "Method" },
                    { key: "Predominance", label: "Predominance" },
                  ]}
                  oldRows={oldDataCollection}
                  newRows={newDataCollection}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                />
              )}
              {hasRevenueModelChange && (
                <ArrayFieldDiffCard
                  title="Revenue Model"
                  columns={[
                    { key: "Revenue_Model_", label: "Model" },
                    { key: "Predominance", label: "Predominance" },
                  ]}
                  oldRows={oldRevenueModel}
                  newRows={newRevenueModel}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                />
              )}
              {diffEntries.map((entry) => (
                <DiffEntryCard
                  key={`${request.id}:${entry.key}`}
                  entry={entry}
                  requestId={request.id}
                  decisions={decisions}
                  onDecide={onDecide}
                  serverRejectBaselines={serverRejectBaselines}
                />
              ))}
            </div>
          )}

          {/* ── Section C: Corporate Events ──────────────────────────── */}
          {hasSectionC && (
            <CorporateEventsSection
              ceRecords={ceRecords}
              requestId={request.id}
              parentCompanyId={request.new_company_id}
            />
          )}

        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply-payload builder
// Strips UI-only *_diff fields and flattens data / data_type / parent_entity_type
// wrappers so the result matches the shape expected by the apply API.
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_SKIP_KEYS = new Set([
  "data",
  "data_type",
  "parent_entity_type",
  "parent_entity_id",
  "change_action",
  "company_record_status",
  "is_new_company",
]);

function unwrapEntityRecord(rec: Record<string, unknown>): Record<string, unknown> {
  // Merge outer wrapper fields + inner data fields, skipping internal metadata.
  const inner = isPlainObject(rec.data) ? (rec.data as Record<string, unknown>) : {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (!ENTITY_SKIP_KEYS.has(k)) result[k] = v;
  }
  for (const [k, v] of Object.entries(inner)) {
    if (!ENTITY_SKIP_KEYS.has(k)) result[k] = v;
  }
  return result;
}

function processEntityArray(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter(isPlainObject)
    .map((rec) => unwrapEntityRecord(rec as Record<string, unknown>));
}

const LOCATIONS_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/locations";

/**
 * Extract every unique non-empty location string from a set of requests.
 * Searches management_people and corporate_events > counterparties > individuals.
 */
function collectUniqueLocations(requests: ChangeRequestItem[]): string[] {
  const seen = new Set<string>();
  for (const req of requests) {
    const payload = getRequestNewPayload(req);

    const allPeople: Record<string, unknown>[] = [
      ...processEntityArray(payload.management_people),
      ...processEntityArray(payload.corporate_events).flatMap((evt) => {
        if (!Array.isArray(evt.counterparties)) return [];
        return (evt.counterparties as unknown[])
          .filter(isPlainObject)
          .flatMap((cp) => {
            const cpRec = cp as Record<string, unknown>;
            return Array.isArray(cpRec.individuals)
              ? (cpRec.individuals as unknown[]).filter(isPlainObject).map((i) => i as Record<string, unknown>)
              : [];
          });
      }),
    ];

    for (const person of allPeople) {
      const loc = typeof person.location === "string" ? person.location.trim() : "";
      if (loc) seen.add(loc);
    }
  }
  return Array.from(seen);
}

// Path helpers used to assemble accepted nested company changes
function getAtPath(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const seg of path) {
    if (!isPlainObject(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
}

function setAtPath(
  target: Record<string, unknown>,
  path: string[],
  value: unknown
): void {
  if (path.length === 0) return;
  let cursor = target;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    if (!isPlainObject(cursor[seg])) cursor[seg] = {};
    cursor = cursor[seg] as Record<string, unknown>;
  }
  const last = path[path.length - 1];
  if (value === undefined) delete cursor[last];
  else cursor[last] = value;
}

function pruneEmptyObjectBranches(value: unknown): unknown {
  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const next = pruneEmptyObjectBranches(child);
    if (isPlainObject(next) && Object.keys(next).length === 0) continue;
    if (next !== undefined) result[key] = next;
  }
  return result;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!isPlainObject(value)) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

/** Stable JSON for comparing persisted review_decisions values with current proposals */
function stableStringifyForReviewBaseline(value: unknown): string {
  try {
    return JSON.stringify(sortKeysDeep(value));
  } catch {
    return String(value);
  }
}

function buildServerRejectBaselineFingerprints(rd: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!rd || typeof rd !== "object") return out;
  for (const [suffix, raw] of Object.entries(rd as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const st = String((raw as Record<string, unknown>).status ?? "").toLowerCase();
    if (st !== "rejected") continue;
    const val = (raw as Record<string, unknown>).value;
    // Use null as sentinel when value is absent so the baseline is always a
    // valid string and serverRejectedHighlight fires even for entries stored
    // without an explicit value (e.g. { "status": "rejected" }).
    out[suffix] = stableStringifyForReviewBaseline(val !== undefined ? val : null);
  }
  return out;
}

function hydrateCompanyDecisionsFromReviewDecisions(
  requestId: number,
  rd: unknown
): Record<string, DecisionState> {
  const out: Record<string, DecisionState> = {};
  if (!rd || typeof rd !== "object") return out;
  for (const [key, raw] of Object.entries(rd as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const st = String((raw as Record<string, unknown>).status ?? "").toLowerCase();
    if (st !== "rejected") continue;
    const decisionKey = /^\d+:/.test(key) ? key : `${requestId}:${key}`;
    out[decisionKey] = "reject";
  }
  return out;
}

function getCompanyDataBlobFromRequest(request: ChangeRequestItem): Record<string, unknown> {
  const newPayload = getRequestNewPayload(request);
  const companyWrapper = isPlainObject(newPayload.company)
    ? (newPayload.company as Record<string, unknown>)
    : null;
  return companyWrapper && isPlainObject(companyWrapper.data)
    ? (companyWrapper.data as Record<string, unknown>)
    : companyWrapper ?? {};
}

function getProposedSnapshotForDecisionSuffix(
  request: ChangeRequestItem,
  suffix: string
): unknown {
  const companyData = getCompanyDataBlobFromRequest(request);

  if (suffix === "investors_diff") return companyData.investors;
  if (suffix === "peers_competitors_diff") return companyData.peers_competitors;
  if (suffix === "potential_acquirers_diff") return companyData.potential_acquirers;
  if (suffix === "acquisition_targets_diff") return companyData.acquisition_targets;
  if (suffix === "sector_diff:Primary Sectors") return companyData.primary_sectors;
  if (suffix === "sector_diff:Secondary Sectors") return companyData.secondary_sectors;
  if (suffix === "parent_company") return companyData.parent_company;
  if (suffix === "array_field:Product Type") return companyData.product_type;
  if (suffix === "array_field:Data Collection Method") return companyData.data_collection_method;
  if (suffix === "array_field:Revenue Model") return companyData.revenue_model;

  const rawPath = suffix.split(".");
  if (rawPath[0] !== "company") return undefined;
  const trimmed = [...rawPath.slice(1)];
  if (trimmed[0] === "data") trimmed.shift();
  if (trimmed.length === 0) return undefined;
  return getAtPath(companyData, trimmed);
}

function buildCompanyRejectedReviewEnvelope(
  request: ChangeRequestItem,
  decisions: Record<string, DecisionState>
): Record<string, { value: unknown; status: "rejected" }> {
  const prefix = `${request.id}:`;
  const out: Record<string, { value: unknown; status: "rejected" }> = {};
  for (const [decisionKey, d] of Object.entries(decisions)) {
    if (!decisionKey.startsWith(prefix) || d !== "reject") continue;
    const suffix = decisionKey.slice(prefix.length);
    const value = getProposedSnapshotForDecisionSuffix(request, suffix);
    out[suffix] = { value, status: "rejected" };
  }
  return out;
}

function buildApplyPayload(
  request: ChangeRequestItem,
  decisions: Record<string, DecisionState>
): Record<string, unknown> {
  const newPayload = getRequestNewPayload(request);

  const prefix = `${request.id}:`;
  const isAccepted = (suffix: string) =>
    decisions[`${prefix}${suffix}`] === "approve";

  // ── Company ───────────────────────────────────────────────────────────────
  const companyWrapper = isPlainObject(newPayload.company)
    ? (newPayload.company as Record<string, unknown>)
    : null;
  // Prefer the nested `data` object if present, otherwise use the wrapper itself.
  const companyData =
    companyWrapper && isPlainObject(companyWrapper.data)
      ? (companyWrapper.data as Record<string, unknown>)
      : (companyWrapper ?? {});

  // Build the company payload from approved decisions only.
  const acceptedCompanyData: Record<string, unknown> = {};

  const acceptTopLevel = (field: string, decisionSuffix: string) => {
    if (!isAccepted(decisionSuffix)) return;
    if (companyData[field] !== undefined) {
      acceptedCompanyData[field] = companyData[field];
    }
  };

  // Dedicated card diffs — investors / peers / acquirers / targets
  acceptTopLevel("investors", "investors_diff");
  acceptTopLevel("peers_competitors", "peers_competitors_diff");
  acceptTopLevel("potential_acquirers", "potential_acquirers_diff");
  acceptTopLevel("acquisition_targets", "acquisition_targets_diff");

  // Sector diffs
  acceptTopLevel("primary_sectors", "sector_diff:Primary Sectors");
  acceptTopLevel("secondary_sectors", "sector_diff:Secondary Sectors");

  // Parent company
  acceptTopLevel("parent_company", "parent_company");

  // Array fields (product type / data collection / revenue model)
  acceptTopLevel("product_type", "array_field:Product Type");
  acceptTopLevel("data_collection_method", "array_field:Data Collection Method");
  acceptTopLevel("revenue_model", "array_field:Revenue Model");

  // Generic field-level diffs from DiffEntryCard. Any approved company path
  // that doesn't match one of the dedicated-card suffixes is copied from the
  // proposed payload into the apply payload.
  const DEDICATED_DECISION_SUFFIXES = new Set([
    "investors_diff",
    "peers_competitors_diff",
    "potential_acquirers_diff",
    "acquisition_targets_diff",
    "parent_company",
  ]);
  for (const [decisionKey, decision] of Object.entries(decisions)) {
    if (!decisionKey.startsWith(prefix)) continue;
    if (decision !== "approve") continue;
    const suffix = decisionKey.slice(prefix.length);
    if (
      DEDICATED_DECISION_SUFFIXES.has(suffix) ||
      suffix.startsWith("sector_diff:") ||
      suffix.startsWith("array_field:")
    ) {
      continue;
    }

    // Only handle paths rooted in the company data; other sections
    // (corporate_events / management_people / subsidiaries) are processed
    // separately below.
    const rawPath = suffix.split(".");
    if (rawPath[0] !== "company") continue;
    const trimmed = rawPath.slice(1);
    if (trimmed[0] === "data") trimmed.shift();
    if (trimmed.length === 0) continue;

    const acceptedValue = getAtPath(companyData, trimmed);
    setAtPath(acceptedCompanyData, trimmed, acceptedValue);
  }

  const COMPANY_OUTER_SKIP = new Set([
    "data", "data_type", "parent_entity_type",
    "company_id", "company_name", "record_status",
  ]);

  const prunedCompanyData = pruneEmptyObjectBranches(acceptedCompanyData);

  const company: Record<string, unknown> = {};
  if (isPlainObject(prunedCompanyData)) {
    for (const [key, value] of Object.entries(prunedCompanyData)) {
      if (key.endsWith("_diff")) continue; // UI-only diff markers — strip them
      if (COMPANY_OUTER_SKIP.has(key)) continue;
      company[key] = value;
    }
  }

  // ── Assemble ──────────────────────────────────────────────────────────────
  const payload: Record<string, unknown> = {
    change_id: request.id,
    new_company_id: request.new_company_id,
  };

  if (Object.keys(company).length > 0) {
    payload.company = {
      record_status: companyWrapper?.record_status ?? "existing",
      ...company,
    };
  }

  return payload;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ChangeReviewModal({ row, onClose, readOnly = false, onApplied }: ChangeReviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestOptions, setRequestOptions] = useState<CompanyChangeRequestSummary[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestItem | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lookup data for inline editing selects
  const [lookupData, setLookupData] = useState<LookupData>({
    primarySectorOptions: [],
    secondarySectorOptions: [],
    ownershipOptions: [],
    businessFocusOptions: [],
    yearOptions: YEAR_OPTIONS,
    counterpartyRoleOptions: [],
    currencyOptions: [],
    jobTitleOptions: [],
    locationOptions: [],
    companyIndividuals: [],
    transactionStatusOptions: TRANSACTION_STATUS_OPTIONS,
  });

  const selectedRequestDecisionSummary = useMemo(() => {
    const requestKey = selectedRequest ? String(selectedRequest.id) : null;
    const summary = { approved: 0, rejected: 0 };
    if (!requestKey) return summary;

    for (const [key, value] of Object.entries(decisions)) {
      if (!value) continue;
      const prefix = key.split(":")[0];
      if (prefix !== requestKey) continue;
      if (value === "approve") summary.approved++;
      else if (value === "reject") summary.rejected++;
    }
    return summary;
  }, [decisions, selectedRequest]);

  const totalApproved = selectedRequestDecisionSummary.approved;
  const totalRejected = selectedRequestDecisionSummary.rejected;
  const hasAnyDecision = totalApproved + totalRejected > 0;
  const pendingRequestsCount = requestOptions.length;

  const reviewDecisionsFingerprint =
    selectedRequest?.review_decisions != null && typeof selectedRequest.review_decisions === "object"
      ? stableStringifyForReviewBaseline(selectedRequest.review_decisions)
      : "";

  const serverRejectBaselines = useMemo(
    () => buildServerRejectBaselineFingerprints(selectedRequest?.review_decisions),
    [selectedRequest?.id, reviewDecisionsFingerprint]
  );

  const handleSubmitReview = async () => {
    const token = authService.getAuthToken();
    if (!token || !selectedRequest) return;

    setSubmitState("submitting");
    setSubmitError(null);

    try {
      const applyPayload = buildApplyPayload(selectedRequest, decisions);
      const rejectEnvelope = buildCompanyRejectedReviewEnvelope(selectedRequest, decisions);

      // Use totalRejected (same source as submit-button enablement) as the
      // authoritative guard so the two conditions are always in sync.
      if (totalRejected > 0) {
        const currentUser = authService.getUser();
        await patchChangeRequestReviewDecisions(token, selectedRequest.id, {
          change_request_id: selectedRequest.id,
          entity_type: selectedRequest.entity_type ?? "",
          submitted_by: getRequestSubmittedBy(selectedRequest),
          old: getRequestOldPayload(selectedRequest),
          new: getRequestNewPayload(selectedRequest),
          reviewed_by: currentUser?.id ?? 0,
          new_company_id: selectedRequest.new_company_id ?? row.company_id,
          documents: selectedRequest.documents ?? [],
          workflow: selectedRequest.workflow ?? "",
          status: selectedRequest.status ?? "Not Contributed",
          review_decisions: rejectEnvelope as Record<string, unknown>,
        });
      }

      if (totalApproved > 0) {
        await applyCompanyChangeRequest(token, applyPayload, selectedRequest.id);
      }

      // Re-fetch the summaries so the list reflects actual server state.
      // A rejection-only submission leaves the request on the server (the contributor
      // still needs to address the rejections), so we must not remove it locally.
      const freshSummaries = await getCompanyChangeRequestSummaries(token, row.company_id);
      const freshFiltered = (freshSummaries as CompanyChangeRequestSummary[])
        .filter((req) => readOnly || isReviewableRequestStatus(req.status))
        .sort((a, b) => (b.created_at || b.id || 0) - (a.created_at || a.id || 0));
      setRequestOptions(freshFiltered);
      // Stay on the same request if it's still reviewable; otherwise move to the first.
      const stillPresent = freshFiltered.some((req) => req.id === selectedRequest.id);
      if (!stillPresent) {
        setSelectedRequestId(freshFiltered[0]?.id ?? null);
      }
      setSubmitState("success");
      onApplied?.();
    } catch (err) {
      setSubmitError((err as Error).message || "Submission failed");
      setSubmitState("error");
    }
  };

  useEffect(() => {
    const token = authService.getAuthToken();
    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const COUNTERPARTY_ROLE_URL =
      "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/counterparty_advisor_roles";
    const CURRENCY_URL =
      "https://xdil-abvj-o7rq.e2.xano.io/api:8Bv5PK4I/currency_lookup";
    const JOB_TITLE_URL =
      "https://xdil-abvj-o7rq.e2.xano.io/api:8Bv5PK4I/job_titles_list";
    const COMPANY_PROFILE_URL =
      `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${row.company_id}`;

    Promise.all([
      getCompanyChangeRequestSummaries(token, row.company_id),
      getPrimarySectors(token).catch(() => []),
      getSecondarySectors(token).catch(() => []),
      getBusinessFocuses(token).catch(() => []),
      getOwnershipTypes(token).catch(() => []),
      fetch(`${COUNTERPARTY_ROLE_URL}?query=`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
        .then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(CURRENCY_URL, { headers: { Accept: "application/json" } })
        .then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(JOB_TITLE_URL, { headers: { Accept: "application/json" } })
        .then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(COMPANY_PROFILE_URL, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([companyRequests, primarySectors, secondarySectors, businessFocuses, ownershipTypes, cpRoles, currencies, jobTitles, companyProfile]) => {
        const filtered = (companyRequests as CompanyChangeRequestSummary[])
          .filter((request) => readOnly || isReviewableRequestStatus(request.status))
          .sort((left, right) =>
            (right.created_at || right.id || 0) - (left.created_at || left.id || 0)
          );
        setRequestOptions(filtered);
        setSelectedRequestId(filtered[0]?.id ?? null);
        setSelectedRequest(null);
        setRequestError(null);
        setDecisions({});
        setSubmitState("idle");
        setSubmitError(null);

        const toOpts = (arr: unknown[], valueKey: string, labelKey: string): LookupOption[] =>
          Array.isArray(arr)
            ? (arr as Record<string, unknown>[]).map((item) => ({
                value: String(item[valueKey] ?? item[labelKey] ?? ""),
                label: String(item[labelKey] ?? item[valueKey] ?? ""),
              })).filter((o) => o.value)
            : [];

        // Preserve numeric id for lookups that need text → id resolution at apply time.
        const toOptsWithId = (arr: unknown[], idKey: string, valueKey: string, labelKey: string): LookupOption[] =>
          Array.isArray(arr)
            ? (arr as Record<string, unknown>[]).map((item) => ({
                value: String(item[valueKey] ?? item[labelKey] ?? ""),
                label: String(item[labelKey] ?? item[valueKey] ?? ""),
                id: typeof item[idKey] === "number" ? (item[idKey] as number) : undefined,
              })).filter((o) => o.value)
            : [];

        setLookupData({
          primarySectorOptions: toOpts(primarySectors as unknown[], "sector_name", "sector_name"),
          secondarySectorOptions: toOpts(secondarySectors as unknown[], "sector_name", "sector_name"),
          businessFocusOptions: toOpts(businessFocuses as unknown[], "id", "business_focus"),
          ownershipOptions: toOpts(ownershipTypes as unknown[], "ownership", "ownership"),
          yearOptions: YEAR_OPTIONS,
          counterpartyRoleOptions: toOpts(cpRoles as unknown[], "counterparty_status", "counterparty_status"),
          currencyOptions: toOpts(currencies as unknown[], "Currency", "Currency"),
          jobTitleOptions: toOptsWithId(jobTitles as unknown[], "id", "job_title", "job_title"),
          locationOptions: [],
          companyIndividuals: getCompanyIndividualOptions(companyProfile),
          transactionStatusOptions: TRANSACTION_STATUS_OPTIONS,
        });
      })
      .catch((err) => {
        setError((err as Error).message || "Failed to load review data");
        setRequestOptions([]);
        setSelectedRequestId(null);
        setSelectedRequest(null);
      })
      .finally(() => setLoading(false));
  }, [row.company_id]);

  useEffect(() => {
    const token = authService.getAuthToken();
    if (!token) return;
    if (selectedRequestId == null) {
      setSelectedRequest(null);
      setRequestError(null);
      setRequestLoading(false);
      setDecisions({});
      return;
    }

    setRequestLoading(true);
    setRequestError(null);
    setSelectedRequest(null);
    setDecisions({});
    setSubmitState("idle");
    setSubmitError(null);

    getChangeRequestById(token, selectedRequestId)
      .then(async (request) => {
        const uniqueLocations = collectUniqueLocations([request]);
        const resolvedLocations = await Promise.all(
          uniqueLocations.map(async (loc): Promise<LookupOption | null> => {
            try {
              const res = await fetch(
                `${LOCATIONS_URL}?search=${encodeURIComponent(loc)}&limit=5`,
                { headers: { Accept: "application/json" } }
              );
              if (!res.ok) return null;
              const data: Array<{ id: number; display_label: string }> = await res.json();
              const exact = data.find((item) => item.display_label === loc);
              const match = exact ?? data[0];
              if (!match) return null;
              return { value: loc, label: loc, id: match.id };
            } catch {
              return null;
            }
          })
        );

        setLookupData((current) => ({
          ...current,
          locationOptions: resolvedLocations.filter((option): option is LookupOption => option !== null),
        }));
        setSelectedRequest(request);
        setDecisions(hydrateCompanyDecisionsFromReviewDecisions(request.id, request.review_decisions));
      })
      .catch((err) => {
        setRequestError((err as Error).message || "Failed to load change request");
      })
      .finally(() => setRequestLoading(false));
  }, [selectedRequestId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-review-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="change-review-title" className="text-xl font-semibold text-gray-900">
                {readOnly ? "Past submissions" : "Review requested changes"} — {companyName(row)}
              </h2>
              {readOnly && (
                <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  View only
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {readOnly
                ? "These submissions have already been reviewed and accepted. No further changes can be made."
                : "Choose a change request first, then review its company updates, new entities, and corporate events before submitting your approval or rejection decisions."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <LookupContext.Provider value={lookupData}>
          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              Loading review requests...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : requestOptions.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              {readOnly
                ? "No past submissions were found for this company."
                : "No pending change requests were found for this company."}
            </div>
          ) : (
            <div className="space-y-4">
              {requestOptions.length > 1 && (
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-400">
                    Select request to review
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {requestOptions.map((request) => {
                      const isSelected = selectedRequestId === request.id;
                      return (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => setSelectedRequestId(request.id)}
                          className={`flex flex-col items-start rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span>Request #{request.id}</span>
                          <span className={`text-xs font-normal ${isSelected ? "text-blue-100" : "text-gray-400"}`}>
                            {(request.status || "Pending").trim()}
                            {request.submitted_by ? ` · ${getRequestSubmittedBy(request)}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {requestLoading ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                  Loading selected change request...
                </div>
              ) : requestError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  {requestError}
                </div>
              ) : selectedRequest ? (
                <PendingRequestBlock
                  request={selectedRequest}
                  decisions={decisions}
                  serverRejectBaselines={serverRejectBaselines}
                  onDecide={(key, value) =>
                    setDecisions((current) => ({ ...current, [key]: value }))
                  }
                />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                  Select a change request to start reviewing.
                </div>
              )}
            </div>
          )}
        </LookupContext.Provider>

        {/* ── Submit footer ─────────────────────────────────────────────── */}
        {!readOnly && !loading && !error && requestOptions.length > 0 && (
          <div className="sticky bottom-0 mt-6 -mx-6 border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Decision summary */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-gray-500">
                  {pendingRequestsCount} request{pendingRequestsCount !== 1 ? "s" : ""} available
                </span>
                {totalApproved > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-0.5 text-xs font-medium text-[#166534]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {totalApproved} accepted
                  </span>
                )}
                {totalRejected > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#fecaca] bg-[#fef2f2] px-2.5 py-0.5 text-xs font-medium text-[#991b1b]">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {totalRejected} rejected
                  </span>
                )}
                {!hasAnyDecision && (
                  <span className="text-xs text-gray-400">
                    Review the selected request and mark the fields you want to accept or reject.
                  </span>
                )}
              </div>

              {/* Submit / status */}
              <div className="flex flex-wrap items-center gap-3">
                {submitState === "success" && (
                  <span className="text-xs font-medium text-emerald-600">
                    ✓ Review submitted successfully
                  </span>
                )}
                {submitState === "error" && submitError && (
                  <span className="max-w-xs truncate text-xs text-rose-600" title={submitError}>
                    ✗ {submitError}
                  </span>
                )}
                <button
                  type="button"
                  disabled={!selectedRequest || requestLoading || !hasAnyDecision || submitState === "submitting" || isAlreadyReviewedStatus(selectedRequest?.status)}
                  onClick={handleSubmitReview}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    submitState === "submitting"
                      ? "bg-blue-600 text-white"
                      : submitState === "success"
                        ? "border border-[#bbf7d0] bg-[#f0fdf4] text-emerald-700 hover:bg-[#dcfce7]"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {submitState === "submitting"
                    ? "Submitting…"
                    : submitState === "success"
                      ? "Submit again"
                      : "Submit review"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
