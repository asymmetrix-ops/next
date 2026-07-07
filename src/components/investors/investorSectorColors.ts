/** Consistent soft sector tag colours across investor profile cards. */
const SECTOR_PALETTE = [
  "oklch(92% 0.06 258)",
  "oklch(92% 0.06 310)",
  "oklch(92% 0.06 25)",
  "oklch(92% 0.06 145)",
  "oklch(92% 0.06 85)",
  "oklch(92% 0.05 200)",
  "oklch(92% 0.05 340)",
  "oklch(92% 0.05 55)",
] as const;

const SECTOR_INK = [
  "oklch(38% 0.08 258)",
  "oklch(38% 0.08 310)",
  "oklch(38% 0.08 25)",
  "oklch(38% 0.08 145)",
  "oklch(38% 0.08 85)",
  "oklch(38% 0.07 200)",
  "oklch(38% 0.07 340)",
  "oklch(38% 0.07 55)",
] as const;

function hashLabel(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i++) {
    h = (h * 31 + label.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function sectorColorFor(label: string): { bg: string; fg: string } {
  const idx = hashLabel(label.trim().toLowerCase()) % SECTOR_PALETTE.length;
  return { bg: SECTOR_PALETTE[idx]!, fg: SECTOR_INK[idx]! };
}

export function mixBarColorFor(index: number): string {
  return SECTOR_INK[index % SECTOR_INK.length]!;
}
