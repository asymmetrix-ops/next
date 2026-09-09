export function formatTargetCompanyFilterValue(
  name: string,
  companyId: number
): string {
  return `${name}|company-${companyId}`;
}

export function parseTargetCompanyFilterValues(values: string[]): number[] {
  const ids: number[] = [];

  for (const raw of values) {
    const token = raw.includes("|") ? raw.split("|")[1] ?? raw : raw;
    if (!token.startsWith("company-")) continue;
    const id = Number(token.slice("company-".length));
    if (Number.isFinite(id) && id > 0) ids.push(id);
  }

  return Array.from(new Set(ids));
}

export function targetCompanyFilterChipLabel(value: string): string {
  if (value.includes("|")) {
    const label = value.split("|")[0]?.trim();
    if (label) return label;
  }
  return value;
}
