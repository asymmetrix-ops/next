export type SearchMultiValueItem = {
  name: string;
  href?: string;
  key?: string;
};

export function splitCommaSeparatedValues(text: string): string[] {
  return text
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function namesToMultiValueItems(
  names: string[],
  keyPrefix: string
): SearchMultiValueItem[] {
  return names.flatMap((name, index) => {
    const label = name.trim();
    if (!label || label === "-") return [];
    return [
      {
        name: label,
        key: `${keyPrefix}-${index}-${label}`,
      },
    ];
  });
}

export function entityLinksToMultiValueItems(
  links: Array<{ id?: number; name: string; href?: string | null }>,
  keyPrefix: string
): SearchMultiValueItem[] {
  return links.flatMap((link, index) => {
    const label = link.name?.trim();
    if (!label) return [];
    return [
      {
        name: label,
        href: link.href ?? undefined,
        key: `${keyPrefix}-${link.id ?? index}-${label}`,
      },
    ];
  });
}
