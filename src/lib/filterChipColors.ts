/**
 * Shared colours for selected-filter chips in every list view.
 *
 * Each filter type owns one colour from this fixed 8-colour palette, so the
 * same filter (e.g. Sector) looks the same on Companies, Investors,
 * Transaction Comps and so on. Style = light fill + stronger text/icon/remove
 * button of the same hue (the News chip look). Every fg/bg pair meets WCAG AA
 * (>= 4.5:1). Green and red are left out on purpose: they mean status
 * (see tagColors.ts). The same values are exposed as CSS variables
 * (--fchip-<name>-bg|border|fg) in globals.css.
 *
 * New filters: add a keyword to FILTER_COLOR_RULES, or they fall back to blue.
 */

export type FilterChipColorName =
  | "blue"
  | "indigo"
  | "violet"
  | "magenta"
  | "sky"
  | "teal"
  | "amber"
  | "slate";

export type FilterChipColor = {
  /** Light shade, chip background. */
  bg: string;
  /** Chip border. */
  border: string;
  /** Stronger shade: text, icon and remove (x) button. */
  fg: string;
};

export const FILTER_CHIP_COLORS: Record<FilterChipColorName, FilterChipColor> = {
  blue: { bg: "#EAF1FE", border: "#C5D6FA", fg: "#1D4ED8" },
  indigo: { bg: "#EEEFFD", border: "#CFD2F7", fg: "#4338CA" },
  violet: { bg: "#F3EDFE", border: "#DACBF8", fg: "#6D28D9" },
  magenta: { bg: "#FCEBF6", border: "#F4C7E6", fg: "#A21CAF" },
  sky: { bg: "#E6F4FB", border: "#BFE0F1", fg: "#0B6A8F" },
  teal: { bg: "#E3F5F7", border: "#B9E2E8", fg: "#0E6F7E" },
  amber: { bg: "#FDF3DC", border: "#F1DBA6", fg: "#8A5200" },
  slate: { bg: "#EDF0F5", border: "#D3D9E3", fg: "#394559" },
};

/** First matching rule wins; tested against the filter id (lower-case). */
const FILTER_COLOR_RULES: Array<[RegExp, FilterChipColorName]> = [
  [/sector|focus|industry|product|revenue_model|data_collection/, "violet"],
  [/country|region|state|province|city|hq|location|geograph/, "sky"],
  [/deal_type|deal_status|transaction|status|funding/, "slate"],
  [/acquirer|buyer|bidder|target|seller|investor|advisor|counterpart|party|company|individual|role/, "magenta"],
  [/ownership|type|stage|listing|source/, "indigo"],
  [/date|year|founded|period|month|quarter/, "teal"],
  [
    /revenue|ebit|ev_|^ev$|margin|growth|multiple|employee|client|arr|nrr|grr|churn|upsell|metric|rule_of|size|amount|value|price|subscription|invest/,
    "amber",
  ],
];

export function getFilterChipColorName(filterId: string): FilterChipColorName {
  const id = String(filterId || "").toLowerCase();
  for (const [re, name] of FILTER_COLOR_RULES) if (re.test(id)) return name;
  return "blue";
}

export function getFilterChipColor(filterId: string): FilterChipColor {
  return FILTER_CHIP_COLORS[getFilterChipColorName(filterId)];
}
