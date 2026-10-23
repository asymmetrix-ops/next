import type {
  EmailAlert,
  EmailAlertFilters,
  EmailScope,
  EmailSection,
} from "@/types/emailAlerts";

export const EMAIL_SECTION_OPTIONS: ReadonlyArray<{
  value: EmailSection;
  label: string;
}> = [
  { value: "corporate_events", label: "Corporate Events" },
  { value: "insights_analysis", label: "Insights & Analysis" },
  { value: "deal_radar", label: "Deal Radar" },
  { value: "news", label: "News" },
];

export const EMAIL_SCOPE_OPTIONS: ReadonlyArray<{
  value: EmailScope;
  label: string;
}> = [
  { value: "all", label: "All companies" },
  { value: "follow", label: "Companies I follow" },
  { value: "portfolio", label: "My Portfolio" },
  { value: "list", label: "A list" },
];

export const EMAIL_FREQUENCY_OPTIONS: ReadonlyArray<{
  value: EmailAlert["email_frequency"];
  label: string;
}> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as_added", label: "As they are added" },
];

export const WEEKDAY_OPTIONS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** Sections a pre-existing combined "digest" alert covered (News came later). */
const LEGACY_DIGEST_SECTIONS: EmailSection[] = [
  "corporate_events",
  "insights_analysis",
  "deal_radar",
];

const SECTION_LABEL = Object.fromEntries(
  EMAIL_SECTION_OPTIONS.map((o) => [o.value, o.label])
) as Record<EmailSection, string>;

export function sectionLabel(section: EmailSection): string {
  return SECTION_LABEL[section];
}

/** Editable view of one email (an alert row, or a draft that has no row yet). */
export interface EmailPref {
  /** Alert id; 0 while the email has not been created. */
  id: number;
  name: string;
  isActive: boolean;
  sections: EmailSection[];
  scope: EmailScope;
  listId: number | null;
  /** HQ country ISO2 codes; empty = all. */
  countries: string[];
  /** Primary sector ids; empty = all. */
  primarySectors: number[];
  /** Corporate Events only; empty = all. */
  dealTypes: string[];
  fundingStages: string[];
  frequency: EmailAlert["email_frequency"];
  dayOfWeek: string | null;
  timezone: string;
  sendTime: string | null;
  /** True when the alert still carries followed-entity filters from the old editor. */
  hasLegacyEntityFilters: boolean;
}

export function isWeeklyNewsAlert(alert: EmailAlert): boolean {
  return alert.item_type === "weekly_news";
}

/** Alerts shown in the editable list (Weekly News has its own fixed row). */
export function isListedAlert(alert: EmailAlert): boolean {
  return !isWeeklyNewsAlert(alert);
}

function sectionsOf(alert: EmailAlert): EmailSection[] {
  const stored = alert.filters?.sections;
  if (stored && stored.length) return stored;
  if (alert.item_type === "digest") return LEGACY_DIGEST_SECTIONS;
  if (alert.item_type === "weekly_news") return ["news"];
  return [alert.item_type];
}

const LEGACY_ENTITY_KEYS = [
  "companies",
  "sectors",
  "individuals",
  "investors",
  "advisors",
] as const;

export function autoEmailName(
  pref: Pick<EmailPref, "sections" | "frequency" | "countries" | "primarySectors">,
  countryNames: string[] = [],
  sectorNames: string[] = []
): string {
  const all = pref.sections.length === EMAIL_SECTION_OPTIONS.length;
  const content = all
    ? "Digest"
    : pref.sections.length === 1
      ? sectionLabel(pref.sections[0])
      : pref.sections.map(sectionLabel).join(" + ") || "Digest";
  const prefix =
    countryNames.length === 1
      ? `${countryNames[0] === "United Kingdom" ? "UK" : countryNames[0]} `
      : sectorNames.length === 1
        ? `${sectorNames[0]} `
        : "";
  const cadence =
    pref.frequency === "weekly"
      ? "Weekly "
      : pref.frequency === "daily" && !prefix
        ? "Daily "
        : "";
  return `${cadence}${prefix}${content}`;
}

export function alertToPref(alert: EmailAlert): EmailPref {
  const filters = alert.filters ?? {};
  const pref: EmailPref = {
    id: alert.id,
    name: filters.name ?? "",
    isActive: alert.is_active,
    sections: sectionsOf(alert),
    scope: filters.scope ?? "all",
    listId: filters.list_id ?? null,
    countries: filters.countries ?? [],
    primarySectors: filters.primary_sectors ?? [],
    dealTypes: filters.deal_types ?? [],
    fundingStages: filters.funding_stages ?? [],
    frequency: alert.email_frequency,
    dayOfWeek: alert.day_of_week,
    timezone: alert.timezone || "Europe/London",
    sendTime: alert.send_time_local,
    hasLegacyEntityFilters:
      !filters.scope &&
      LEGACY_ENTITY_KEYS.some((k) => (filters[k]?.length ?? 0) > 0),
  };
  if (!pref.name) pref.name = autoEmailName(pref);
  return pref;
}

/**
 * Turn an edited pref back into an alert. `base` is the stored alert (so
 * untouched fields, such as legacy entity filters, survive) or a blank one.
 */
export function prefToAlert(pref: EmailPref, base: EmailAlert): EmailAlert {
  const itemType: EmailAlert["item_type"] =
    pref.sections.length === 1 ? pref.sections[0] : "digest";
  const hasCe = pref.sections.includes("corporate_events");

  const filters: EmailAlertFilters = {
    ...(base.filters ?? {}),
    name: pref.name,
    scope: pref.scope,
    list_id: pref.scope === "list" ? pref.listId : null,
    countries: pref.countries,
    primary_sectors: pref.primarySectors,
    deal_types: hasCe ? pref.dealTypes : [],
    funding_stages: hasCe ? pref.fundingStages : [],
  };
  if (itemType === "digest") {
    filters.sections = pref.sections;
  } else {
    delete filters.sections;
  }

  return {
    ...base,
    item_type: itemType,
    is_active: pref.isActive,
    email_frequency: pref.frequency,
    day_of_week: pref.frequency === "weekly" ? pref.dayOfWeek : null,
    timezone: pref.timezone,
    send_time_local: pref.frequency === "as_added" ? null : pref.sendTime,
    filters,
  };
}

export function newEmailPref(defaults: {
  sendTime: string;
  timezone: string;
}): EmailPref {
  return {
    id: 0,
    name: "",
    isActive: true,
    sections: EMAIL_SECTION_OPTIONS.map((o) => o.value),
    scope: "all",
    listId: null,
    countries: [],
    primarySectors: [],
    dealTypes: [],
    fundingStages: [],
    frequency: "daily",
    dayOfWeek: null,
    timezone: defaults.timezone,
    sendTime: defaults.sendTime,
    hasLegacyEntityFilters: false,
  };
}

function joinNames(names: string[]): string {
  return names.length <= 2
    ? names.join(" and ")
    : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export interface FilterSummaryContext {
  listLabel?: string;
  countryNames: string[];
  sectorNames: string[];
}

/** "Companies I follow · UK and Germany · all sectors · Acquisition, Sale" */
export function summariseFilters(
  pref: EmailPref,
  ctx: FilterSummaryContext
): string {
  const scope =
    pref.scope === "list"
      ? `List: ${ctx.listLabel ?? "none selected"}`
      : (EMAIL_SCOPE_OPTIONS.find((o) => o.value === pref.scope)?.label ??
        "All companies");
  const parts = [
    scope,
    ctx.countryNames.length ? joinNames(ctx.countryNames) : "all countries",
    ctx.sectorNames.length ? joinNames(ctx.sectorNames) : "all sectors",
  ];
  if (pref.sections.includes("corporate_events")) {
    if (pref.dealTypes.length) parts.push(joinNames(pref.dealTypes));
    if (pref.fundingStages.length) parts.push(joinNames(pref.fundingStages));
  }
  return parts.join(" · ");
}

export function describeSchedule(pref: EmailPref): {
  when: string;
  tz: string;
} {
  const tz = pref.timezone;
  if (pref.frequency === "as_added") return { when: "As they are added", tz: "" };
  const time = pref.sendTime ?? "";
  if (pref.frequency === "weekly") {
    const day = pref.dayOfWeek
      ? pref.dayOfWeek.charAt(0).toUpperCase() + pref.dayOfWeek.slice(1)
      : "";
    return { when: `${day}s, ${time}`, tz };
  }
  return { when: `Daily, ${time}`, tz };
}
