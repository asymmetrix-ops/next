import type { EmailAlert, EmailAlertFilters } from "@/types/emailAlerts";

/** Deal types for CE email alerts, in display order. */
export const CE_DEAL_TYPE_OPTIONS = [
  "Acquisition",
  "Sale",
  "IPO",
  "MBO",
  "Investment",
  "Strategic Review",
  "Divestment",
  "Restructuring",
  "Dual track",
  "Closing",
  "Grant",
  "Debt financing",
  "Partnership",
] as const;

export type CeDealType = (typeof CE_DEAL_TYPE_OPTIONS)[number];

export const CE_FUNDING_STAGE_GROUPS: ReadonlyArray<{
  label: string;
  values: readonly string[];
}> = [
  {
    label: "Early stage",
    values: ["Pre-seed", "Seed", "Series A", "Series B", "Series C"],
  },
  {
    label: "Growth stage",
    values: ["Series D", "Series E", "Series F", "Series G", "Growth"],
  },
  {
    label: "Structured / non-equity",
    values: ["Credit facility", "Debt financing", "Grant"],
  },
  {
    label: "Exit / liquidity",
    values: ["Buyout", "MBO", "Take Private", "Dual track", "Closing"],
  },
  {
    label: "Other",
    values: [
      "IPO",
      "Restructuring",
      "Strategic Review",
      "Partnership",
      "Divestment",
      "Sale",
    ],
  },
];

export const CE_FUNDING_STAGE_OPTIONS = CE_FUNDING_STAGE_GROUPS.flatMap(
  (group) => group.values
);

export function isCorporateEventsEmailAlert(
  itemType: EmailAlert["item_type"] | undefined
): boolean {
  return itemType === "corporate_events" || itemType === "digest";
}

/** Parse API filter value (empty array = no filter). */
export function parseCeFilterValues(
  raw: string | string[] | null | undefined
): string[] | undefined {
  if (raw == null) return undefined;

  if (Array.isArray(raw)) {
    const values = raw.filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
    return values.length > 0 ? values : undefined;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    return trimmed
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return undefined;
}

/** Pass selected values to the API exactly as chosen in the UI. */
export function buildCeTypeFilterArraysForApi(
  dealTypes: string[] | undefined,
  fundingStages: string[] | undefined
): { deal_types: string[]; funding_stages: string[] } {
  const allowedDealTypes = CE_DEAL_TYPE_OPTIONS as readonly string[];
  const allowedFundingStages = CE_FUNDING_STAGE_OPTIONS as readonly string[];

  return {
    deal_types: (dealTypes ?? []).filter((value) => allowedDealTypes.includes(value)),
    funding_stages: (fundingStages ?? []).filter((value) =>
      allowedFundingStages.includes(value)
    ),
  };
}

export function resolveSelectedStringOptions(
  stored: string[] | undefined,
  allOptions: readonly string[]
): string[] {
  if (!stored || stored.length === 0) {
    return [...allOptions];
  }
  const allowed = new Set(allOptions);
  const valid = stored.filter((value) => allowed.has(value));
  return valid.length > 0 ? valid : [...allOptions];
}

export function isAllOptionsSelected(
  selected: string[],
  allOptions: readonly string[]
): boolean {
  if (allOptions.length === 0) return true;
  const selectedSet = new Set(selected);
  return allOptions.every((value) => selectedSet.has(value));
}

export function normalizeCeTypeFilters(
  raw: EmailAlertFilters | null | undefined
): Pick<EmailAlertFilters, "deal_types" | "funding_stages"> {
  return {
    deal_types: resolveSelectedStringOptions(
      parseCeFilterValues(raw?.deal_types as string | string[] | undefined),
      CE_DEAL_TYPE_OPTIONS
    ),
    funding_stages: resolveSelectedStringOptions(
      parseCeFilterValues(raw?.funding_stages as string | string[] | undefined),
      CE_FUNDING_STAGE_OPTIONS
    ),
  };
}

/** Omit CE type filters when every option is selected (equivalent to no filter). */
export function stripCeTypeFiltersIfAllSelected(
  filters: EmailAlertFilters
): EmailAlertFilters {
  const out: EmailAlertFilters = { ...filters };

  if (
    !out.deal_types ||
    out.deal_types.length === 0 ||
    isAllOptionsSelected(out.deal_types, CE_DEAL_TYPE_OPTIONS)
  ) {
    delete out.deal_types;
  }

  if (
    !out.funding_stages ||
    out.funding_stages.length === 0 ||
    isAllOptionsSelected(out.funding_stages, CE_FUNDING_STAGE_OPTIONS)
  ) {
    delete out.funding_stages;
  }

  return out;
}

export function isCeDealTypeFilterActive(dealTypes: string[] | undefined): boolean {
  return (
    !!dealTypes &&
    dealTypes.length > 0 &&
    !isAllOptionsSelected(dealTypes, CE_DEAL_TYPE_OPTIONS)
  );
}

export function isCeFundingStageFilterActive(
  fundingStages: string[] | undefined
): boolean {
  return (
    !!fundingStages &&
    fundingStages.length > 0 &&
    !isAllOptionsSelected(fundingStages, CE_FUNDING_STAGE_OPTIONS)
  );
}
