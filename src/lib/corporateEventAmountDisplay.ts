import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";
import { platformCurrencyIdToCode } from "@/lib/platformCurrency";

const SYMBOL_TO_CODE: Record<string, string> = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
};

export type CorporateEventAmountFields = {
  deal_type?: string | null;
  investment_display?: string | null;
  ev_display?: string | null;
  currency_name?: string | null;
  investment_data?: Record<string, unknown> | null;
  ev_data?: Record<string, unknown> | null;
};

function normalizeCurrencyCode(raw?: string | null): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  if (upper === "US$" || upper === "US") return "USD";
  return SYMBOL_TO_CODE[trimmed] ?? upper;
}

function parseNumericToken(raw: string): number | null {
  const num = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : null;
}

function parseAmountDisplayString(
  raw: string
): { currency: string; amount: number } | null {
  let value = raw.trim();
  if (!value) return null;

  value = value.replace(/\s*[mM]\s*$/, "");

  const codeFirst = value.match(/^([A-Z]{3})\s*([\d,]+(?:\.\d+)?)$/i);
  if (codeFirst) {
    const amount = parseNumericToken(codeFirst[2]);
    if (amount != null) {
      return { currency: codeFirst[1].toUpperCase(), amount };
    }
  }

  const symbolFirst = value.match(/^([$£€¥])\s*([\d,]+(?:\.\d+)?)$/);
  if (symbolFirst) {
    const amount = parseNumericToken(symbolFirst[2]);
    const currency = normalizeCurrencyCode(symbolFirst[1]);
    if (amount != null && currency) {
      return { currency, amount };
    }
  }

  const codeLast = value.match(/^([\d,]+(?:\.\d+)?)\s*([A-Z]{3})$/i);
  if (codeLast) {
    const amount = parseNumericToken(codeLast[1]);
    if (amount != null) {
      return { currency: codeLast[2].toUpperCase(), amount };
    }
  }

  const compactCode = value.match(/^([A-Z]{3})([\d,]+(?:\.\d+)?)$/i);
  if (compactCode) {
    const amount = parseNumericToken(compactCode[2]);
    if (amount != null) {
      return { currency: compactCode[1].toUpperCase(), amount };
    }
  }

  const compactSymbol = value.match(/^([$£€¥])([\d,]+(?:\.\d+)?)$/);
  if (compactSymbol) {
    const amount = parseNumericToken(compactSymbol[2]);
    const currency = normalizeCurrencyCode(compactSymbol[1]);
    if (amount != null && currency) {
      return { currency, amount };
    }
  }

  return null;
}

/** Normalize API amount strings (e.g. `GBP11560` → `GBP11,560`). */
export function normalizeCorporateEventAmountDisplay(
  display: string | null | undefined
): string | null {
  const trimmed = display?.trim();
  if (!trimmed) return null;

  const parsed = parseAmountDisplayString(trimmed);
  if (!parsed) return trimmed;

  const formatted = formatMetricMillionsPlain(parsed.amount);
  if (formatted === EMPTY_DISPLAY) return trimmed;

  return `${parsed.currency}${formatted}`;
}

/** Format a millions value with a currency code prefix (no trailing "m"). */
export function formatCorporateEventMillionsAmount(
  amount: unknown,
  currencyCode?: string | null,
  notAvailableLabel = "Not available"
): string {
  const plain = formatMetricMillionsPlain(amount);
  if (plain === EMPTY_DISPLAY) return notAvailableLabel;

  const code = normalizeCurrencyCode(currencyCode);
  if (!code) return plain;

  return `${code}${plain}`;
}

function resolveInvestmentCurrency(
  event: CorporateEventAmountFields
): string | undefined {
  const topLevel = normalizeCurrencyCode(event.currency_name);
  if (topLevel) return topLevel;

  const data = event.investment_data;
  if (!data) return undefined;

  if (typeof data.currency === "string") {
    const resolved = normalizeCurrencyCode(data.currency);
    if (resolved) return resolved;
  }

  const objectCurrency =
    typeof data.currency === "object" && data.currency
      ? (data.currency as { Currency?: string }).Currency
      : undefined;
  const resolvedObject = normalizeCurrencyCode(objectCurrency);
  if (resolvedObject) return resolvedObject;

  const nestedCurrency = (data._currency as { Currency?: string } | undefined)
    ?.Currency;
  return normalizeCurrencyCode(nestedCurrency);
}

function resolveEvCurrency(
  event: CorporateEventAmountFields
): string | undefined {
  const topLevel = normalizeCurrencyCode(event.currency_name);
  if (topLevel) return topLevel;

  const data = event.ev_data;
  const nestedCurrency = (data?._currency as { Currency?: string } | undefined)
    ?.Currency;
  const objectCurrency =
    typeof data?.currency === "object" && data.currency
      ? (data.currency as { Currency?: string }).Currency
      : undefined;

  return (
    normalizeCurrencyCode(nestedCurrency) ??
    normalizeCurrencyCode(objectCurrency)
  );
}

function asAmountFields(event: unknown): CorporateEventAmountFields {
  return ((event && typeof event === "object" ? event : {}) ??
    {}) as CorporateEventAmountFields;
}

/** Prefer API `investment_display`, then converted/native amount fields. */
export function formatCorporateEventInvestmentAmount(
  event: unknown,
  notAvailableLabel = "Not available"
): string {
  const normalized = asAmountFields(event);
  const display = normalizeCorporateEventAmountDisplay(normalized.investment_display);
  if (display) return display;

  const investment = normalized.investment_data;
  return formatCorporateEventMillionsAmount(
    investment?.investment_amount_m ?? investment?.investment_amount ?? null,
    resolveInvestmentCurrency(normalized),
    notAvailableLabel
  );
}

/** Prefer API `ev_display`, then converted/native EV fields or EV band. */
export function formatCorporateEventEnterpriseValue(
  event: unknown,
  notAvailableLabel = "Not available"
): string {
  const normalized = asAmountFields(event);
  const display = normalizeCorporateEventAmountDisplay(normalized.ev_display);
  if (display) return display;

  const evData = normalized.ev_data;
  const formatted = formatCorporateEventMillionsAmount(
    evData?.enterprise_value_m ?? null,
    resolveEvCurrency(normalized),
    notAvailableLabel
  );
  if (formatted !== notAvailableLabel) return formatted;

  const band =
    typeof evData?.ev_band === "string" ? evData.ev_band.trim() : "";
  return band || notAvailableLabel;
}

function hasMeaningfulAmount(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const trimmed = String(value).trim();
  return trimmed !== "" && trimmed !== "0";
}

function asDetailEventRecord(
  event: unknown
): Record<string, unknown> | null {
  if (!event || typeof event !== "object") return null;
  return event as Record<string, unknown>;
}

function resolveDetailPreferredCurrencyCode(
  preferredCurrencyId?: number | null
): string | undefined {
  if (preferredCurrencyId == null || preferredCurrencyId <= 0) return undefined;
  return platformCurrencyIdToCode(preferredCurrencyId) ?? undefined;
}

function readNestedInvestmentCurrency(
  event: Record<string, unknown>
): string | undefined {
  const inv = event.investment_data as
    | {
        _currency?: { Currency?: string };
        currency?: { Currency?: string } | string;
      }
    | undefined;
  if (typeof inv?.currency === "string" && inv.currency.trim()) {
    return normalizeCurrencyCode(inv.currency);
  }
  const currencyObject =
    inv?.currency && typeof inv.currency === "object" ? inv.currency : undefined;
  return (
    normalizeCurrencyCode(currencyObject?.Currency) ??
    normalizeCurrencyCode(inv?._currency?.Currency)
  );
}

function readNestedEvCurrency(event: Record<string, unknown>): string | undefined {
  const evData = event.ev_data as
    | {
        _currency?: { Currency?: string };
        currency?: { Currency?: string } | string;
      }
    | undefined;
  if (typeof evData?.currency === "string" && evData.currency.trim()) {
    return normalizeCurrencyCode(evData.currency);
  }
  const currencyObject =
    evData?.currency && typeof evData.currency === "object"
      ? evData.currency
      : undefined;
  return (
    normalizeCurrencyCode(evData?._currency?.Currency) ??
    normalizeCurrencyCode(currencyObject?.Currency)
  );
}

/** Resolve investment amount (m) for corporate event detail pages. */
export function resolveCorporateEventDetailInvestmentAmount(
  event: unknown,
  preferredCurrencyId?: number | null
): string | undefined {
  const record = asDetailEventRecord(event);
  if (!record) return undefined;

  const converted = record.investment_amount_m_converted === true;
  const preferredCode = resolveDetailPreferredCurrencyCode(preferredCurrencyId);

  if (converted && hasMeaningfulAmount(record.investment_amount_m)) {
    return String(record.investment_amount_m);
  }

  const nested = (record.investment_data as { investment_amount_m?: unknown })
    ?.investment_amount_m;
  if (hasMeaningfulAmount(nested)) return String(nested);

  const flat = record.investment_amount_m ?? record.investment_amount;
  if (hasMeaningfulAmount(flat)) return String(flat);

  if (preferredCode && hasMeaningfulAmount(record.investment_amount_m)) {
    return String(record.investment_amount_m);
  }

  return undefined;
}

/** Resolve investment currency for corporate event detail pages. */
export function resolveCorporateEventDetailInvestmentCurrency(
  event: unknown,
  preferredCurrencyId?: number | null
): string | undefined {
  const record = asDetailEventRecord(event);
  if (!record) return undefined;

  const converted = record.investment_amount_m_converted === true;
  const preferredCode = resolveDetailPreferredCurrencyCode(preferredCurrencyId);
  if (converted && preferredCode) return preferredCode;

  const topLevel = normalizeCurrencyCode(
    typeof record.investment_currency === "string"
      ? record.investment_currency
      : undefined
  );
  if (topLevel) return topLevel;

  const nested = readNestedInvestmentCurrency(record);
  if (nested) return nested;

  return (
    normalizeCurrencyCode(
      typeof record.enterprise_value_currency === "string"
        ? record.enterprise_value_currency
        : undefined
    ) ?? readNestedEvCurrency(record)
  );
}

/** Resolve enterprise value (m) for corporate event detail pages. */
export function resolveCorporateEventDetailEnterpriseValueAmount(
  event: unknown,
  preferredCurrencyId?: number | null
): string | undefined {
  const record = asDetailEventRecord(event);
  if (!record) return undefined;

  const converted = record.enterprise_value_m_converted === true;

  if (converted && hasMeaningfulAmount(record.enterprise_value_m)) {
    return String(record.enterprise_value_m);
  }

  const nested = (record.ev_data as { enterprise_value_m?: unknown })
    ?.enterprise_value_m;
  if (hasMeaningfulAmount(nested)) return String(nested);

  const flat = record.enterprise_value_m ?? record.enterprise_value;
  if (hasMeaningfulAmount(flat)) return String(flat);

  const preferredCode = resolveDetailPreferredCurrencyCode(preferredCurrencyId);
  if (preferredCode && hasMeaningfulAmount(record.enterprise_value_m)) {
    return String(record.enterprise_value_m);
  }

  return undefined;
}

/** Resolve enterprise value currency for corporate event detail pages. */
export function resolveCorporateEventDetailEnterpriseValueCurrency(
  event: unknown,
  preferredCurrencyId?: number | null
): string | undefined {
  const record = asDetailEventRecord(event);
  if (!record) return undefined;

  const converted = record.enterprise_value_m_converted === true;
  const preferredCode = resolveDetailPreferredCurrencyCode(preferredCurrencyId);
  if (converted && preferredCode) return preferredCode;

  const topLevel = normalizeCurrencyCode(
    typeof record.enterprise_value_currency === "string"
      ? record.enterprise_value_currency
      : undefined
  );
  if (topLevel) return topLevel;

  const nested = readNestedEvCurrency(record);
  if (nested) return nested;

  return resolveCorporateEventDetailInvestmentCurrency(event, preferredCurrencyId);
}

/** Amount column helper: investment first, then EV; partnerships show dash. */
export function formatCorporateEventAmountCell(
  event: unknown,
  notAvailableLabel = "-"
): string {
  const normalized = asAmountFields(event);
  if (/partnership/i.test(normalized.deal_type || "")) return notAvailableLabel;

  const investment = formatCorporateEventInvestmentAmount(normalized, "");
  if (investment) return investment;

  return formatCorporateEventEnterpriseValue(normalized, notAvailableLabel);
}
