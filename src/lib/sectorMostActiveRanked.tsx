import React from "react";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";

export interface RankedEntity {
  name: string;
  count: number;
  id?: number;
  mostRecentTarget?: string;
  mostRecentTargetId?: number;
  closedDate?: string;
  corporateEventId?: number;
  logoUrl?: string;
}

export function toStringSafe(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidates = [
      obj.items,
      (obj as { data?: unknown[] }).data,
      (obj as { results?: unknown[] }).results,
      (obj as { list?: unknown[] }).list,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate as unknown[];
    }
  }
  return [];
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function getFirstMatchingValue(
  obj: Record<string, unknown>,
  candidateKeys: string[]
): unknown {
  const map: Record<string, string> = {};
  for (const k of Object.keys(obj)) {
    map[normalizeKey(k)] = k;
  }
  for (const key of candidateKeys) {
    const exact = obj[key];
    if (exact !== undefined) return exact;
    const normalized = normalizeKey(key);
    const realKey = map[normalized];
    if (realKey && obj[realKey] !== undefined) return obj[realKey];
  }
  return undefined;
}

export function getFirstMatchingNumber(
  obj: Record<string, unknown>,
  candidateKeys: string[]
): number | undefined {
  const val = getFirstMatchingValue(obj, candidateKeys);
  return typeof val === "number"
    ? val
    : typeof val === "string" && val.trim() !== ""
    ? Number(val)
    : undefined;
}

export function renderMostRecentTargetValue(
  entity: Pick<
    RankedEntity,
    "mostRecentTarget" | "mostRecentTargetId" | "corporateEventId"
  >,
  className = "text-blue-600 hover:underline"
): React.ReactNode {
  if (!entity.mostRecentTarget) return "-";

  if (entity.mostRecentTargetId) {
    return (
      <a
        href={`/company/${entity.mostRecentTargetId}`}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {entity.mostRecentTarget}
      </a>
    );
  }

  if (entity.corporateEventId) {
    return (
      <a
        href={`/corporate-event/${entity.corporateEventId}`}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {entity.mostRecentTarget}
      </a>
    );
  }

  return entity.mostRecentTarget;
}

export function mapRankedEntities(raw: unknown): RankedEntity[] {
  const arr = extractArray(raw);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      const name = toStringSafe(
        getFirstMatchingValue(obj, [
          "name",
          "company",
          "investor",
          "acquirer",
          "label",
          "entity",
          "firm",
          "Acquirer",
        ])
      );
      const countRaw =
        getFirstMatchingNumber(obj, [
          "Deals_5y",
          "deals_5y",
          "count",
          "deals",
          "total",
          "n",
          "times",
          "occurrences",
        ]) ?? 0;
      const mostRecentTargetRaw = getFirstMatchingValue(obj, [
        "Most_Recent_Target",
        "most_recent_target",
        "Most_Recent_Investment",
        "most_recent_investment",
        "Most_Recent_Acquisition",
        "most_recent_acquisition",
      ]);
      let mostRecentTarget = "";
      let mostRecentTargetId: number | undefined;
      if (mostRecentTargetRaw && typeof mostRecentTargetRaw === "object") {
        const targetObj = mostRecentTargetRaw as Record<string, unknown>;
        mostRecentTarget = toStringSafe(
          getFirstMatchingValue(targetObj, [
            "name",
            "company_name",
            "target_name",
            "Target",
            "target",
          ]) || ""
        );
        mostRecentTargetId = getFirstMatchingNumber(targetObj, [
          "id",
          "company_id",
          "target_company_id",
          "new_company_id",
          "original_new_company_id",
        ]);
      } else {
        mostRecentTarget = toStringSafe(mostRecentTargetRaw || "");
        mostRecentTargetId = getFirstMatchingNumber(obj, [
          "Most_Recent_Target_Id",
          "Most_Recent_Target_ID",
          "Most_Recent_Target_company_id",
          "most_recent_target_company_id",
          "Most_Recent_Target_Company_ID",
          "most_recent_target_id",
          "Most_Recent_Target_id",
          "Target_company_id",
          "target_company_id",
          "most_recent_target_new_company_id",
        ]);
      }
      const closedDate = toStringSafe(
        getFirstMatchingValue(obj, [
          "Closed_Date",
          "closed_date",
          "date",
          "Announcement_Date",
          "announcement_date",
          "Most_Recent_Announcement_Date",
          "most_recent_announcement_date",
        ]) || ""
      );
      const acquirerId = getFirstMatchingNumber(obj, [
        "acquirer_company_id",
        "original_new_company_id",
        "new_company_id",
        "acquirer_id",
        "company_id",
        "id",
        "investor_company_id",
        "vc_investor_company_id",
      ]);
      const corporateEventId = getFirstMatchingNumber(obj, [
        "Most_Recent_Target_Event_Id",
        "most_recent_target_event_id",
        "Corporate_Event_ID",
        "corporate_event_id",
        "event_id",
        "corporateEventId",
      ]);
      const rawLogo = toStringSafe(
        getFirstMatchingValue(obj, [
          "Acquirer_Logo_Url",
          "Investor_Logo_Url",
          "PE_Investor_Logo_Url",
          "VC_Investor_Logo_Url",
          "logo",
          "logo_url",
          "logoUrl",
        ]) || ""
      );
      const logoUrl = resolveCompanyLogoSrc(rawLogo) ?? "";
      const count = typeof countRaw === "number" ? countRaw : 0;
      if (!name) return null;
      return {
        name,
        count,
        id: typeof acquirerId === "number" ? acquirerId : undefined,
        mostRecentTarget: mostRecentTarget || undefined,
        mostRecentTargetId:
          typeof mostRecentTargetId === "number" ? mostRecentTargetId : undefined,
        closedDate: closedDate || undefined,
        corporateEventId:
          typeof corporateEventId === "number" ? corporateEventId : undefined,
        logoUrl: logoUrl || undefined,
      } as RankedEntity;
    })
    .filter(Boolean) as RankedEntity[];
}
