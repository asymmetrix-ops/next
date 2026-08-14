import type {
  CorporateEvent,
  EventIndividual,
  OtherCounterparty,
  RelatedAdvisor,
  TargetCounterparty,
} from "@/types/individual";

function coerceUnknownToArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw === null || raw === undefined) return [];
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "[]") return [];
  try {
    const normalized = trimmed.replace(/\\u0022/g, '"');
    const parsed = JSON.parse(normalized) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanName(name: unknown): string {
  return String(name ?? "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim();
}

function parseTargetCompanies(
  raw: unknown
): Array<{ id: number; name: string }> {
  return coerceUnknownToArray(raw)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as { id?: number; name?: string };
      const id = typeof rec.id === "number" && rec.id > 0 ? rec.id : null;
      const name = cleanName(rec.name);
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((item): item is { id: number; name: string } => item !== null);
}

function parseOtherCounterparties(raw: unknown): OtherCounterparty[] {
  return coerceUnknownToArray(raw)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const id = Number(
        rec.counterparty_id ??
          rec.id ??
          rec.new_company_counterparty ??
          rec.company_id ??
          0
      );
      const name = cleanName(rec.counterparty_name ?? rec.name ?? rec.company_name);
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      const role = String(rec.counterparty_status ?? rec.role ?? "").toLowerCase();
      return {
        new_company_counterparty: id,
        id,
        name,
        _is_that_investor: Boolean(rec._is_that_investor ?? role.includes("investor")),
        _is_that_data_analytic_company: Boolean(rec._is_that_data_analytic_company),
      };
    })
    .filter((item): item is OtherCounterparty => item !== null);
}

function parseRelatedAdvisors(raw: unknown): RelatedAdvisor[] {
  const advisors: RelatedAdvisor[] = [];
  for (const item of coerceUnknownToArray(raw)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const nested = rec._new_company as { id?: number; name?: string } | undefined;
    const id = Number(
      rec.advisor_company_id ??
        rec.company_id ??
        nested?.id ??
        rec.id ??
        0
    );
    const name = cleanName(
      rec.advisor_company_name ?? rec.company_name ?? nested?.name ?? rec.name
    );
    if (!Number.isFinite(id) || id <= 0 || !name) continue;
    advisors.push({
      new_company_advised: id,
      _new_company: {
        id,
        name,
        primary_business_focus_id: [],
        _is_that_investor: false,
        _is_that_data_analytic_company: false,
      },
    });
  }
  return advisors;
}

function parseRelatedIndividuals(raw: unknown): EventIndividual[] {
  return coerceUnknownToArray(raw)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const id = Number(rec.id ?? rec.individuals_id ?? 0);
      const name = cleanName(rec.name ?? rec.advisor_individuals);
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { id, advisor_individuals: name };
    })
    .filter((item): item is EventIndividual => item !== null);
}

function isLegacyIndividualCorporateEvent(
  raw: Record<string, unknown>
): raw is Record<string, unknown> & CorporateEvent {
  return (
    Array.isArray(raw._other_counterparties_of_corporate_events) ||
    raw._target_counterparty_of_corporate_events != null ||
    (raw.ev_data != null && typeof raw.ev_data === "object")
  );
}

function resolveTargetCounterparty(
  raw: Record<string, unknown>
): TargetCounterparty | undefined {
  const target = parseTargetCompanies(raw.target_companies)[0];
  if (target) {
    return {
      new_company_counterparty: target.id,
      id: target.id,
      name: target.name,
    };
  }

  const related = raw.related_counterparty as
    | {
        counterparty_id?: number;
        counterparty_name?: string;
      }
    | undefined;
  const relatedId = Number(related?.counterparty_id ?? 0);
  const relatedName = cleanName(related?.counterparty_name);
  if (relatedId > 0 && relatedName) {
    return {
      new_company_counterparty: relatedId,
      id: relatedId,
      name: relatedName,
    };
  }

  const companyAdvisedId =
    typeof raw.company_advised_id === "number" ? raw.company_advised_id : null;
  const companyAdvisedName = cleanName(raw.company_advised_name);
  const companyAdvisedRole = String(raw.company_advised_role ?? "").trim();
  if (
    companyAdvisedId &&
    companyAdvisedName &&
    /target/i.test(companyAdvisedRole)
  ) {
    return {
      new_company_counterparty: companyAdvisedId,
      id: companyAdvisedId,
      name: companyAdvisedName,
    };
  }

  return undefined;
}

export function extractIndividualCorporateEvents(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.items,
    record.events,
    record.Corporate_Events,
    record.New_Events_Wits_Advisors,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

/** Map flat `get_individuals_events` rows (and legacy shapes) into profile events. */
export function normalizeIndividualCorporateEvent(event: unknown): CorporateEvent {
  const raw = (event && typeof event === "object" ? event : {}) as Record<
    string,
    unknown
  >;

  if (isLegacyIndividualCorporateEvent(raw)) {
    return raw as CorporateEvent;
  }

  const evData = raw.ev_data as
    | {
        ev_source?: string;
        enterprise_value_m?: string | number | null;
        currency_id?: number;
        _currency?: { Currency?: string };
      }
    | undefined;

  const enterpriseValueRaw =
    raw.enterprise_value_m ?? evData?.enterprise_value_m ?? "";
  const currencyId = Number(raw.currency_id ?? evData?.currency_id ?? 0);
  const currencyName =
    String(raw.currency_name ?? "").trim() ||
    evData?._currency?.Currency ||
    undefined;

  const targetCounterparty = resolveTargetCounterparty(raw);
  const otherCounterparties = parseOtherCounterparties(
    raw.other_counterparties ??
      raw["Other Counterparties"] ??
      raw._other_counterparties_of_corporate_events
  );

  const companyAdvisedId =
    typeof raw.company_advised_id === "number" ? raw.company_advised_id : null;
  const companyAdvisedName = cleanName(raw.company_advised_name);
  const companyAdvisedRole = String(raw.company_advised_role ?? "").trim();
  const targetId = targetCounterparty?.id ?? null;

  if (
    companyAdvisedId &&
    companyAdvisedName &&
    companyAdvisedId !== targetId &&
    !otherCounterparties.some((cp) => cp.id === companyAdvisedId)
  ) {
    otherCounterparties.push({
      new_company_counterparty: companyAdvisedId,
      id: companyAdvisedId,
      name: companyAdvisedName,
      _is_that_investor: /investor/i.test(companyAdvisedRole),
      _is_that_data_analytic_company: false,
    });
  }

  const relatedAdvisors = parseRelatedAdvisors(
    raw.other_advisors ??
      raw.Advisors ??
      raw._related_advisor_to_corporate_events
  );

  const relatedIndividuals = parseRelatedIndividuals(
    raw.advisor_individuals ??
      raw["Other Individuals"] ??
      raw._related_to_corporate_event_individuals
  );

  return {
    id: Number(raw.id ?? 0),
    description: String(raw.description ?? raw.Description ?? ""),
    announcement_date: String(
      raw.announcement_date ?? raw["Date Announced"] ?? ""
    ),
    deal_type: String(raw.deal_type ?? raw.Type ?? ""),
    ev_data: {
      ev_source: String(raw.ev_source ?? evData?.ev_source ?? ""),
      enterprise_value_m: String(enterpriseValueRaw ?? ""),
      currency_id: currencyId,
      ...(currencyName
        ? {
            _currency: {
              id: currencyId,
              created_at: 0,
              Currency: currencyName,
            },
          }
        : {}),
    },
    _other_advisors_of_corporate_event: [],
    _target_counterparty_of_corporate_events: targetCounterparty,
    _other_counterparties_of_corporate_events: otherCounterparties,
    _relater_to_corporate_event_cpawa_advisors_individuals: [],
    _counterparty_advised_of_corporate_events: companyAdvisedRole
      ? [
          {
            counterparty_type: 0,
            _counterpartys_type: {
              counterparty_status: companyAdvisedRole,
            },
          },
        ]
      : [],
    _related_to_corporate_event_individuals: relatedIndividuals,
    _related_advisor_to_corporate_events: relatedAdvisors,
  };
}
