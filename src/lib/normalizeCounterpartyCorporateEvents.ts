import { formatCorporateEventMillionsAmount } from "@/lib/corporateEventAmountDisplay";
import {
  extractIndividualCorporateEvents,
  normalizeIndividualCorporateEvent,
} from "@/lib/normalizeIndividualCorporateEvent";
import type { Currency } from "@/lib/fxRates";
import {
  platformCurrencyIdToCode,
} from "@/lib/platformCurrency";
import type { CorporateEvent as IndividualCorporateEvent } from "@/types/individual";

type InvestmentAmountBlock = {
  amount_m?: number | string | null;
  currency_id?: number;
  amount_m_native_currency_id?: number;
  amount_m_converted?: boolean;
};

type EnterpriseValueBlock = {
  enterprise_value_m?: number | string | null;
  currency_id?: number;
  enterprise_value_m_native_currency_id?: number;
  enterprise_value_m_converted?: boolean;
  ev_band?: string;
};

export function parseCounterpartyRelatedEvents(
  relatedEvents: unknown
): Record<string, unknown> | null {
  if (relatedEvents == null) return null;
  if (typeof relatedEvents === "string") {
    const trimmed = relatedEvents.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof relatedEvents === "object") {
    return relatedEvents as Record<string, unknown>;
  }
  return null;
}

function cleanEventName(name: unknown): string {
  return String(name ?? "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readPreferredCurrencyId(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const id = Number((raw as Record<string, unknown>).preferred_currency_id ?? 0);
  return id > 0 ? id : null;
}

function indexCorporateEventsById(
  parsed: Record<string, unknown>
): Map<number, Record<string, unknown>> {
  const map = new Map<number, Record<string, unknown>>();
  if (!Array.isArray(parsed.Corporate_Events)) return map;

  for (const item of parsed.Corporate_Events) {
    if (!item || typeof item !== "object") continue;
    const id = Number((item as Record<string, unknown>).id ?? 0);
    if (id > 0) map.set(id, item as Record<string, unknown>);
  }
  return map;
}

function resolveConvertedCurrencyCode(
  converted: boolean,
  preferredCurrencyId: number | null,
  blockCurrencyId?: number,
  nativeCurrencyId?: number
): Currency | null {
  if (converted && preferredCurrencyId) {
    return platformCurrencyIdToCode(preferredCurrencyId);
  }

  const currencyId = Number(blockCurrencyId ?? nativeCurrencyId ?? 0);
  if (currencyId > 0) {
    return platformCurrencyIdToCode(currencyId);
  }

  if (preferredCurrencyId) {
    return platformCurrencyIdToCode(preferredCurrencyId);
  }

  return null;
}

function readNativeCurrencyCode(
  data: Record<string, unknown> | undefined
): Currency | null {
  if (!data) return null;

  if (typeof data.currency === "string" && data.currency.trim()) {
    const code = data.currency.trim().toUpperCase();
    if (code === "USD" || code === "GBP" || code === "EUR") {
      return code;
    }
  }

  const nested = (data.currency as { Currency?: string } | undefined)?.Currency;
  if (nested?.trim()) {
    const code = nested.trim().toUpperCase();
    if (code === "USD" || code === "GBP" || code === "EUR") {
      return code;
    }
  }

  const nestedCurrency = (data._currency as { Currency?: string } | undefined)
    ?.Currency;
  if (nestedCurrency?.trim()) {
    const code = nestedCurrency.trim().toUpperCase();
    if (code === "USD" || code === "GBP" || code === "EUR") {
      return code;
    }
  }

  const currencyId = Number(data.currency_id ?? 0);
  if (currencyId > 0) {
    return platformCurrencyIdToCode(currencyId);
  }

  return null;
}

function hasMeaningfulAmount(value: unknown): boolean {
  if (value == null) return false;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "nan") return false;
  return true;
}

/** Apply flat `investment_data_*` / `ev_data_*` conversion metadata from investor CE payloads. */
export function applyFlatCorporateEventCurrencyConversion(
  raw: Record<string, unknown>,
  preferredCurrencyId: number | null
): Record<string, unknown> {
  const investmentData = raw.investment_data as Record<string, unknown> | undefined;
  const rawAmount =
    investmentData?.investment_amount_m ?? investmentData?.investment_amount ?? null;
  const investmentConverted =
    raw.investment_data_investment_amount_m_converted === true;
  const investmentNativeId = Number(
    raw.investment_data_investment_amount_m_native_currency_id ??
      investmentData?.currency_id ??
      0
  );
  const investmentCurrencyCode =
    resolveConvertedCurrencyCode(
      investmentConverted,
      preferredCurrencyId,
      investmentData?.currency_id as number | undefined,
      investmentNativeId
    ) ?? readNativeCurrencyCode(investmentData);
  const investmentDisplay =
    hasMeaningfulAmount(rawAmount) && investmentCurrencyCode
      ? formatCorporateEventMillionsAmount(rawAmount, investmentCurrencyCode, "")
      : null;

  const evData = raw.ev_data as Record<string, unknown> | undefined;
  const rawEv = evData?.enterprise_value_m ?? null;
  const evConverted = raw.ev_data_enterprise_value_m_converted === true;
  const evNativeId = Number(
    raw.ev_data_enterprise_value_m_native_currency_id ?? evData?.currency_id ?? 0
  );
  const evCurrencyCode =
    resolveConvertedCurrencyCode(
      evConverted,
      preferredCurrencyId,
      evData?.currency_id as number | undefined,
      evNativeId
    ) ??
    readNativeCurrencyCode(evData) ??
    investmentCurrencyCode;
  const evDisplay =
    hasMeaningfulAmount(rawEv) && evCurrencyCode
      ? formatCorporateEventMillionsAmount(rawEv, evCurrencyCode, "")
      : null;

  const currencyName =
    investmentCurrencyCode ?? evCurrencyCode ?? raw.currency_name;

  return {
    ...raw,
    ...(currencyName ? { currency_name: currencyName } : {}),
    ...(investmentDisplay ? { investment_display: investmentDisplay } : {}),
    ...(evDisplay ? { ev_display: evDisplay } : {}),
    ...(investmentData && investmentCurrencyCode && hasMeaningfulAmount(rawAmount)
      ? {
          investment_data: {
            ...investmentData,
            investment_amount_m: String(rawAmount),
            currency: investmentCurrencyCode,
            _currency: {
              id: investmentNativeId,
              created_at: 0,
              Currency: investmentCurrencyCode,
            },
          },
        }
      : {}),
    ...(evData && evCurrencyCode && hasMeaningfulAmount(rawEv)
      ? {
          ev_data: {
            ...evData,
            enterprise_value_m: String(rawEv),
            _currency: {
              id: evNativeId,
              created_at: 0,
              Currency: evCurrencyCode,
            },
          },
        }
      : {}),
  };
}

export function resolveCounterpartyInvestmentAmount(
  evt: Record<string, unknown>,
  corpEvent: Record<string, unknown> | undefined,
  preferredCurrencyId: number | null
): {
  amount: string | null;
  currencyCode: Currency | null;
  nativeCurrencyId: number;
  fundingStage: string;
  investmentDisplay: string | null;
} {
  const block = (evt["Investment Amount"] ?? null) as InvestmentAmountBlock | null;
  const corpInvestment = corpEvent?.investment_data as
    | {
        currency_id?: number;
        Funding_stage?: string;
        investment_amount_m?: string | number | null;
      }
    | undefined;

  const rawAmount = block?.amount_m ?? corpInvestment?.investment_amount_m ?? null;
  const hasAmount = rawAmount != null && String(rawAmount).trim() !== "";
  const nativeCurrencyId = Number(
    block?.amount_m_native_currency_id ??
      corpInvestment?.currency_id ??
      block?.currency_id ??
      0
  );
  const converted = block?.amount_m_converted === true;
  const currencyCode = resolveConvertedCurrencyCode(
    converted,
    preferredCurrencyId,
    block?.currency_id,
    nativeCurrencyId
  );
  const fundingStage = String(corpInvestment?.Funding_stage ?? "").trim();
  const amount = hasAmount ? String(rawAmount) : null;
  const investmentDisplay =
    amount && currencyCode
      ? formatCorporateEventMillionsAmount(amount, currencyCode, "")
      : null;

  return {
    amount,
    currencyCode,
    nativeCurrencyId,
    fundingStage,
    investmentDisplay: investmentDisplay || null,
  };
}

function resolveCounterpartyEnterpriseValue(
  evt: Record<string, unknown>,
  corpEvent: Record<string, unknown> | undefined,
  preferredCurrencyId: number | null,
  currencyCode: Currency | null
): {
  enterpriseValue: string;
  evCurrencyId: number;
  evCurrencyCode: Currency | null;
  evDisplay: string | null;
  evBand: string;
} {
  const block = (evt["Enterprise Value"] ?? null) as EnterpriseValueBlock | null;
  const corpEv = corpEvent?.ev_data as
    | {
        enterprise_value_m?: string | number | null;
        currency_id?: number;
        ev_band?: string;
      }
    | undefined;

  const rawEv =
    block?.enterprise_value_m ?? corpEv?.enterprise_value_m ?? "";
  const hasEv = rawEv != null && String(rawEv).trim() !== "";
  const nativeCurrencyId = Number(
    block?.enterprise_value_m_native_currency_id ??
      corpEv?.currency_id ??
      block?.currency_id ??
      0
  );
  const converted = block?.enterprise_value_m_converted === true;
  const evCurrencyCode =
    resolveConvertedCurrencyCode(
      converted,
      preferredCurrencyId,
      block?.currency_id,
      nativeCurrencyId
    ) ?? currencyCode;
  const evBand = String(block?.ev_band ?? corpEv?.ev_band ?? "").trim();
  const enterpriseValue = hasEv ? String(rawEv) : "";
  const evDisplay =
    enterpriseValue && evCurrencyCode
      ? formatCorporateEventMillionsAmount(enterpriseValue, evCurrencyCode, "")
      : null;

  return {
    enterpriseValue,
    evCurrencyId: nativeCurrencyId,
    evCurrencyCode,
    evDisplay: evDisplay || null,
    evBand,
  };
}

function mapOtherCounterparties(
  evt: Record<string, unknown>
): Array<Record<string, unknown>> {
  const otherCpsArr = Array.isArray(evt["Other Counterparties"])
    ? (evt["Other Counterparties"] as Array<Record<string, unknown>>)
    : [];

  return otherCpsArr.map((cp) => ({
    id: Number(cp?.counterparty_id ?? 0),
    counterparty_id: Number(cp?.counterparty_id ?? 0),
    name: cleanEventName(cp?.counterparty_name),
    counterparty_status: String(cp?.counterparty_status ?? ""),
    _new_company: {
      id: Number(cp?.counterparty_id ?? 0),
      name: cleanEventName(cp?.counterparty_name),
    },
  }));
}

function mapAdvisors(evt: Record<string, unknown>): Array<Record<string, unknown>> {
  const advisorsArr = Array.isArray(evt.Advisors)
    ? (evt.Advisors as Array<Record<string, unknown>>)
    : [];

  return advisorsArr.map((advisor) => ({
    advisor_company_id: Number(advisor?.company_id ?? advisor?.advisor_company_id ?? 0),
    advisor_company_name: cleanEventName(
      advisor?.company_name ?? advisor?.advisor_company_name
    ),
    advisor_company: {
      id: Number(advisor?.company_id ?? advisor?.advisor_company_id ?? 0),
      name: cleanEventName(advisor?.company_name ?? advisor?.advisor_company_name),
    },
  }));
}

/** Build investor-profile / corporate-events-table rows from counterparty payload. */
export function buildInvestorCorporateEventsFromCounterpartyPayload(
  parsed: Record<string, unknown>,
  preferredCurrencyId: number | null
): Array<Record<string, unknown>> {
  const eventsTable = Array.isArray(parsed.Events_Table)
    ? (parsed.Events_Table as Record<string, unknown>[])
    : [];
  if (eventsTable.length === 0) return [];

  const corporateEventsById = indexCorporateEventsById(parsed);

  return eventsTable.map((evt) => {
    const eventId = Number(evt?.id ?? 0);
    const corpEvent = eventId > 0 ? corporateEventsById.get(eventId) : undefined;
    const investment = resolveCounterpartyInvestmentAmount(
      evt,
      corpEvent,
      preferredCurrencyId
    );
    const ev = resolveCounterpartyEnterpriseValue(
      evt,
      corpEvent,
      preferredCurrencyId,
      investment.currencyCode
    );
    const otherCounterparties = mapOtherCounterparties(evt);
    const primaryTarget = otherCounterparties.find((cp) => cp.id && cp.name);

    const description = String(evt?.Description ?? evt?.description ?? corpEvent?.description ?? "");
    const announcementDate = String(
      evt?.["Date Announced"] ?? evt?.announcement_date ?? corpEvent?.announcement_date ?? ""
    );
    const dealType = String(evt?.Type ?? evt?.deal_type ?? corpEvent?.deal_type ?? "");
    const advisors = mapAdvisors(evt);

    return {
      id: eventId,
      description,
      announcement_date: announcementDate,
      deal_type: dealType,
      ...(investment.investmentDisplay
        ? { investment_display: investment.investmentDisplay }
        : {}),
      ...(ev.evDisplay ? { ev_display: ev.evDisplay } : {}),
      ...(investment.currencyCode ? { currency_name: investment.currencyCode } : {}),
      ...(investment.amount
        ? {
            investment_data: {
              investment_amount_m: investment.amount,
              currency_id: investment.nativeCurrencyId,
              ...(investment.fundingStage
                ? { Funding_stage: investment.fundingStage }
                : {}),
              ...(investment.currencyCode
                ? {
                    currency: investment.currencyCode,
                    _currency: {
                      id: investment.nativeCurrencyId,
                      created_at: 0,
                      Currency: investment.currencyCode,
                    },
                  }
                : {}),
            },
          }
        : {}),
      ev_data: {
        ev_source: "",
        enterprise_value_m: ev.enterpriseValue,
        currency_id: ev.evCurrencyId,
        ...(ev.evBand ? { ev_band: ev.evBand } : {}),
        ...(ev.evCurrencyCode
          ? {
              _currency: {
                id: ev.evCurrencyId,
                created_at: 0,
                Currency: ev.evCurrencyCode,
              },
            }
          : {}),
      },
      ...(primaryTarget
        ? {
            targets: [
              {
                id: primaryTarget.id as number,
                name: primaryTarget.name as string,
              },
            ],
            target_company: {
              id: primaryTarget.id as number,
              name: primaryTarget.name as string,
            },
            target_counterparty: {
              new_company_counterparty: primaryTarget.id as number,
              new_company: {
                id: primaryTarget.id as number,
                name: primaryTarget.name as string,
              },
            },
          }
        : {}),
      other_counterparties: otherCounterparties.slice(1),
      advisors,
    };
  });
}

/** Map individuals_id → display name from Events_Table["Other Individuals"]. */
export function buildOtherIndividualIdToNameMap(
  parsed: Record<string, unknown>
): Map<number, string> {
  const map = new Map<number, string>();
  const eventsTable = Array.isArray(parsed.Events_Table)
    ? (parsed.Events_Table as Record<string, unknown>[])
    : [];

  for (const evt of eventsTable) {
    const arr = Array.isArray(evt?.["Other Individuals"])
      ? (evt["Other Individuals"] as Array<Record<string, unknown>>)
      : [];
    for (const oi of arr) {
      const id = Number(oi?.individuals_id ?? 0);
      const name = cleanEventName(oi?.name);
      if (id > 0 && name) map.set(id, name);
    }
  }

  return map;
}

/** Build individual-profile events from counterparty payload. */
export function buildIndividualCorporateEventsFromCounterpartyPayload(
  parsed: Record<string, unknown>,
  preferredCurrencyId: number | null
): IndividualCorporateEvent[] {
  const eventsTable = Array.isArray(parsed.Events_Table)
    ? (parsed.Events_Table as Record<string, unknown>[])
    : [];
  if (eventsTable.length === 0) return [];

  const corporateEventsById = indexCorporateEventsById(parsed);

  return eventsTable.map((evt) => {
    const eventId = Number(evt?.id ?? 0);
    const corpEvent = eventId > 0 ? corporateEventsById.get(eventId) : undefined;
    const investment = resolveCounterpartyInvestmentAmount(
      evt,
      corpEvent,
      preferredCurrencyId
    );
    const ev = resolveCounterpartyEnterpriseValue(
      evt,
      corpEvent,
      preferredCurrencyId,
      investment.currencyCode
    );

    const description = String(evt?.Description ?? evt?.description ?? "");
    const announced = String(evt?.["Date Announced"] ?? evt?.announcement_date ?? "");
    const type = String(evt?.Type ?? evt?.deal_type ?? "");

    const relatedCounterparty = (evt?.["Related Counterparty"] ?? {}) as {
      counterparty_status?: string;
      counterparty_id?: number;
      counterparty_name?: string;
    };
    const relatedCounterpartyStatus = String(
      relatedCounterparty?.counterparty_status ?? ""
    );
    const relatedCounterpartyId = Number(relatedCounterparty?.counterparty_id ?? 0);
    const relatedCounterpartyName = cleanEventName(relatedCounterparty?.counterparty_name);

    const otherCounterparties = mapOtherCounterparties(evt).map((cp) => ({
      new_company_counterparty: cp.id as number,
      id: cp.id as number,
      name: cp.name as string,
      _is_that_investor: false,
      _is_that_data_analytic_company: false,
    }));

    const primaryTarget = otherCounterparties[0];
    const targetCounterparty =
      primaryTarget && primaryTarget.id > 0 && primaryTarget.name
        ? {
            new_company_counterparty: primaryTarget.id,
            id: primaryTarget.id,
            name: primaryTarget.name,
          }
        : relatedCounterpartyId > 0 && relatedCounterpartyName
          ? {
              new_company_counterparty: relatedCounterpartyId,
              id: relatedCounterpartyId,
              name: relatedCounterpartyName,
            }
          : undefined;

    const otherCounterpartiesForDisplay = primaryTarget
      ? [
          ...otherCounterparties.slice(1),
          ...(relatedCounterpartyId > 0 &&
          relatedCounterpartyName &&
          relatedCounterpartyId !== primaryTarget.id
            ? [
                {
                  new_company_counterparty: relatedCounterpartyId,
                  id: relatedCounterpartyId,
                  name: relatedCounterpartyName,
                  _is_that_investor: false,
                  _is_that_data_analytic_company: false,
                },
              ]
            : []),
        ]
      : otherCounterparties;

    const otherIndividualsArr = Array.isArray(evt?.["Other Individuals"])
      ? (evt["Other Individuals"] as Array<{ individuals_id?: number; name?: string }>)
      : [];
    const relatedIndividuals = otherIndividualsArr.map((oi) => {
      const id = Number(oi?.individuals_id ?? 0);
      const name = String(oi?.name ?? "").trim();
      return {
        id,
        advisor_individuals: name || (id ? `Individual ${id}` : ""),
      };
    });

    const relatedAdvisors = mapAdvisors(evt).map((a) => ({
      new_company_advised: Number(a.advisor_company_id ?? 0),
      _new_company: {
        id: Number(a.advisor_company_id ?? 0),
        name: String(a.advisor_company_name ?? ""),
        primary_business_focus_id: [] as number[],
        _is_that_investor: false,
        _is_that_data_analytic_company: false,
      },
    }));

    return {
      id: eventId,
      description,
      announcement_date: announced,
      deal_type: type,
      ...(investment.investmentDisplay
        ? { investment_display: investment.investmentDisplay }
        : {}),
      ...(ev.evDisplay ? { ev_display: ev.evDisplay } : {}),
      ...(investment.currencyCode ? { currency_name: investment.currencyCode } : {}),
      ...(investment.amount
        ? {
            investment_data: {
              investment_amount_m: investment.amount,
              currency_id: investment.nativeCurrencyId,
              ...(investment.fundingStage
                ? { Funding_stage: investment.fundingStage }
                : {}),
              ...(investment.currencyCode
                ? {
                    currency: investment.currencyCode,
                    _currency: {
                      id: investment.nativeCurrencyId,
                      created_at: 0,
                      Currency: investment.currencyCode,
                    },
                  }
                : {}),
            },
          }
        : {}),
      ev_data: {
        ev_source: "",
        enterprise_value_m: ev.enterpriseValue,
        currency_id: ev.evCurrencyId,
        ...(ev.evCurrencyCode
          ? {
              _currency: {
                id: ev.evCurrencyId,
                created_at: 0,
                Currency: ev.evCurrencyCode,
              },
            }
          : {}),
      },
      _other_advisors_of_corporate_event: [],
      _target_counterparty_of_corporate_events: targetCounterparty,
      _other_counterparties_of_corporate_events: otherCounterpartiesForDisplay,
      _relater_to_corporate_event_cpawa_advisors_individuals: [],
      _counterparty_advised_of_corporate_events: [
        {
          counterparty_type: 0,
          _counterpartys_type: {
            counterparty_status: relatedCounterpartyStatus || "",
          },
        },
      ],
      _related_to_corporate_event_individuals: relatedIndividuals,
      _related_advisor_to_corporate_events: relatedAdvisors,
    } as IndividualCorporateEvent;
  });
}

export function extractInvestorCorporateEvents(raw: unknown): unknown[] {
  const preferredCurrencyId = readPreferredCurrencyId(raw);

  const container = (raw as { conterparty_table_content?: unknown[] } | null)
    ?.conterparty_table_content?.[0] as
    | { related_events?: unknown }
    | undefined;
  const parsed = parseCounterpartyRelatedEvents(container?.related_events);

  if (parsed && Array.isArray(parsed.Events_Table)) {
    return buildInvestorCorporateEventsFromCounterpartyPayload(
      parsed,
      preferredCurrencyId
    );
  }

  const extracted = extractIndividualCorporateEvents(raw);
  return extracted.map((item) => {
    const rawEvent = (
      item && typeof item === "object" ? item : {}
    ) as Record<string, unknown>;
    const withCurrency = applyFlatCorporateEventCurrencyConversion(
      rawEvent,
      preferredCurrencyId
    );
    return normalizeIndividualCorporateEvent(withCurrency);
  });
}
