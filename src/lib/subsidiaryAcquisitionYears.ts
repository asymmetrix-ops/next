/**
 * Maps subsidiary company IDs → calendar year acquired, from corporate events
 * where the profile company is the acquirer/investor and the subsidiary is the target.
 */

export type SubsidiaryAcquisitionEvent = {
  deal_type?: string;
  announcement_date?: string;
  this_company_status?: string;
  targets?: Array<{ id?: number; name?: string }>;
  target_company?: { id?: number; name?: string };
  target_counterparty?: {
    new_company_counterparty?: number;
    new_company?: { id?: number; name?: string };
    _new_company?: { id?: number; name?: string };
  };
  target_label?: string;
  buyers?: Array<{ id?: number; page_type?: string }>;
  buyers_investors?: Array<{ id?: number; page_type?: string }>;
  investors?: Array<{ id?: number; page_type?: string }>;
  other_counterparties?: Array<{
    id?: number;
    counterparty_status?: string;
    page_type?: string;
    _new_company?: { id?: number; _is_that_investor?: boolean };
  }>;
  /** Legacy: non-investor counterparties (often buyers on acquisitions) */
  "0"?: Array<{
    _new_company?: { id?: number; name?: string; _is_that_investor?: boolean };
  }>;
};

function isSubsidiaryYearDealType(dealType: string): boolean {
  const d = dealType.toLowerCase();
  if (/partnership/i.test(d)) return false;
  return (
    d.includes("acquisition") ||
    d.includes("merger") ||
    d.includes("investment") ||
    d.includes("invest")
  );
}

function extractAnnouncementYear(iso?: string | null): number | null {
  if (!iso) return null;
  try {
    const y = new Date(iso).getFullYear();
    return Number.isFinite(y) && y >= 1800 && y <= 2100 ? y : null;
  } catch {
    return null;
  }
}

function collectBuyerIds(event: SubsidiaryAcquisitionEvent): number[] {
  const ids = new Set<number>();

  const add = (id: unknown) => {
    if (typeof id === "number" && Number.isFinite(id)) ids.add(id);
  };

  if (Array.isArray(event.buyers)) {
    for (const b of event.buyers) {
      if (b?.page_type !== "investor") add(b.id);
    }
  }

  if (Array.isArray(event.buyers_investors)) {
    for (const b of event.buyers_investors) {
      if (b?.page_type !== "investor") add(b.id);
    }
  }

  if (Array.isArray(event.other_counterparties)) {
    for (const cp of event.other_counterparties) {
      const status = (cp.counterparty_status || "").toLowerCase();
      if (status.includes("acquir") || status.includes("buyer")) {
        add(cp.id);
        add(cp._new_company?.id);
      }
    }
  }

  if (Array.isArray(event["0"])) {
    for (const entry of event["0"]) {
      if (!entry._new_company?._is_that_investor) {
        add(entry._new_company?.id);
      }
    }
  }

  return Array.from(ids);
}

function collectInvestorIds(event: SubsidiaryAcquisitionEvent): number[] {
  const ids = new Set<number>();

  const add = (id: unknown) => {
    if (typeof id === "number" && Number.isFinite(id)) ids.add(id);
  };

  if (Array.isArray(event.investors)) {
    for (const inv of event.investors) add(inv.id);
  }

  if (Array.isArray(event.buyers_investors)) {
    for (const b of event.buyers_investors) {
      if (b?.page_type === "investor") add(b.id);
    }
  }

  return Array.from(ids);
}

function collectTargetIds(event: SubsidiaryAcquisitionEvent): number[] {
  const ids = new Set<number>();

  const add = (id: unknown) => {
    if (typeof id === "number" && Number.isFinite(id)) ids.add(id);
  };

  if (Array.isArray(event.targets)) {
    for (const t of event.targets) add(t.id);
  }

  add(event.target_company?.id);
  add(event.target_counterparty?.new_company_counterparty);
  add(event.target_counterparty?.new_company?.id);
  add(event.target_counterparty?._new_company?.id);

  return Array.from(ids);
}

function isParentCompanyLinkingParty(
  event: SubsidiaryAcquisitionEvent,
  parentCompanyId: number
): boolean {
  const status = (event.this_company_status || "").trim().toLowerCase();
  if (status) {
    if (
      status.includes("seller") ||
      status.includes("divest") ||
      status === "target"
    ) {
      return false;
    }
    if (
      status.includes("acquir") ||
      status.includes("buyer") ||
      status.includes("investor") ||
      status.includes("invest")
    ) {
      return true;
    }
  }

  if (collectBuyerIds(event).includes(parentCompanyId)) return true;
  if (collectInvestorIds(event).includes(parentCompanyId)) return true;

  // Profile-scoped events: parent is a linking party unless they are the target.
  if (!status) {
    return !collectTargetIds(event).includes(parentCompanyId);
  }

  return false;
}

/** Build subsidiary id → year acquired (earliest matching acquisition/investment). */
export function buildSubsidiaryAcquisitionYearMap(
  parentCompanyId: number,
  events: SubsidiaryAcquisitionEvent[]
): Map<number, number> {
  const map = new Map<number, number>();

  for (const event of events) {
    const dealType = event.deal_type || "";
    if (!isSubsidiaryYearDealType(dealType)) continue;
    if (!isParentCompanyLinkingParty(event, parentCompanyId)) continue;

    const year = extractAnnouncementYear(event.announcement_date);
    if (year === null) continue;

    for (const targetId of collectTargetIds(event)) {
      if (targetId === parentCompanyId) continue;
      const prev = map.get(targetId);
      if (prev === undefined || year < prev) {
        map.set(targetId, year);
      }
    }
  }

  return map;
}

export function subsidiaryAcquisitionYearLabel(
  subsidiaryId: number,
  yearBySubsidiaryId: ReadonlyMap<number, number> | Record<number, number>
): string {
  const year =
    yearBySubsidiaryId instanceof Map
      ? yearBySubsidiaryId.get(subsidiaryId)
      : (yearBySubsidiaryId as Record<number, number | undefined>)[
          subsidiaryId
        ];
  return typeof year === "number" && Number.isFinite(year) ? String(year) : "-";
}
