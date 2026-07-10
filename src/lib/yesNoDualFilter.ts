export type YesNoDualFilterValue = { yes: boolean; no: boolean };

export const DEFAULT_YES_NO_DUAL_VALUE: YesNoDualFilterValue = {
  yes: true,
  no: true,
};

export function normalizeYesNoDualFilterValue(value: unknown): YesNoDualFilterValue {
  if (!value || typeof value !== "object") return DEFAULT_YES_NO_DUAL_VALUE;
  const v = value as Partial<YesNoDualFilterValue>;
  return {
    yes: Boolean(v.yes),
    no: Boolean(v.no),
  };
}

/** True when exactly one of Yes / No is selected (filter restricts results). */
export function isRestrictiveYesNoDualFilter(value: unknown): boolean {
  const v = normalizeYesNoDualFilterValue(value);
  return (v.yes && !v.no) || (!v.yes && v.no);
}

export function summarizeYesNoDualFilter(value: unknown): string {
  const v = normalizeYesNoDualFilterValue(value);
  if (!v.yes && !v.no) return "";
  const parts: string[] = [];
  if (v.yes) parts.push("Yes");
  if (v.no) parts.push("No");
  return parts.join(", ");
}
