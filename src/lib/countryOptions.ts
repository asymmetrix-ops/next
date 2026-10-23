import { getCountryFlagUrl } from "@/lib/dealRadar";
import type { MultiSelectOption } from "@/components/settings/EmailPrefsMultiSelect";

let nameToIso2: Map<string, string> | null = null;

/** English country name -> ISO2, built from the runtime's region names. */
function iso2ForName(name: string): string | null {
  if (!nameToIso2) {
    nameToIso2 = new Map();
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const a of letters) {
      for (const b of letters) {
        const code = `${a}${b}`;
        const label = display.of(code);
        if (label && label !== code) nameToIso2.set(label.toLowerCase(), code);
      }
    }
    // Names the HQ list commonly uses that differ from the CLDR spelling.
    nameToIso2.set("uk", "GB");
    nameToIso2.set("usa", "US");
    nameToIso2.set("united states of america", "US");
    nameToIso2.set("czech republic", "CZ");
    nameToIso2.set("south korea", "KR");
    nameToIso2.set("russia", "RU");
  }
  return nameToIso2.get(name.trim().toLowerCase()) ?? null;
}

/**
 * Full HQ country list for the email filter: every HQ country from the
 * locations list that maps to an ISO2 code, plus the countries News already
 * reports (these carry their own ISO2). Sorted by name, de-duplicated by code.
 */
export function buildCountryOptions(
  newsCountries: Array<{ iso2: string; name: string }>,
  hqCountryNames: string[]
): MultiSelectOption[] {
  const byCode = new Map<string, string>();
  for (const c of newsCountries) {
    byCode.set(c.iso2.toUpperCase(), c.name);
  }
  for (const name of hqCountryNames) {
    const code = iso2ForName(name);
    if (code && !byCode.has(code)) byCode.set(code, name);
  }
  return Array.from(byCode.entries())
    .map(([value, label]) => ({ value, label, flagUrl: getCountryFlagUrl(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
