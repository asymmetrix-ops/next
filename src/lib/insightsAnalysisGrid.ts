/** Column counts — must stay in sync with `.ia-grid` rules in insights-analysis/page.tsx */
export const IA_GRID_COLUMNS_TABLET = 3;
export const IA_GRID_COLUMNS_NAV_OPEN = 4;
export const IA_GRID_COLUMNS_NAV_COLLAPSED = 5;

const IA_MAX_PER_PAGE = 60;
const IA_MIN_ROWS = 4;

/** Fallback when column count is unknown (SSR / first paint). */
export const IA_DEFAULT_PER_PAGE = 20;

export function getInsightsGridColumns(
  navOpen: boolean,
  viewportWidth: number
): number {
  if (viewportWidth <= 768) return 1;
  if (viewportWidth <= 1024) return IA_GRID_COLUMNS_TABLET;
  return navOpen ? IA_GRID_COLUMNS_NAV_OPEN : IA_GRID_COLUMNS_NAV_COLLAPSED;
}

/** Target page size for a layout (~same visual density, full last row). */
export function getAdaptiveDefaultPerPage(columns: number): number {
  if (columns <= 1) return 20;
  if (columns === IA_GRID_COLUMNS_TABLET) return 21; // 7 × 3
  if (columns === IA_GRID_COLUMNS_NAV_COLLAPSED) return 20; // 4 × 5
  return 20; // 5 × 4 (nav open)
}

export function isPerPageAlignedWithGrid(perPage: number, columns: number): boolean {
  if (columns <= 1) return true;
  return perPage > 0 && perPage % columns === 0;
}

/** Multiples of `columns` between ~4 rows and IA_MAX_PER_PAGE. */
export function getInsightsPerPageOptions(columns: number): number[] {
  if (columns <= 1) {
    return [10, 15, 20, 30, 40, 50, 60];
  }

  const options: number[] = [];
  for (let rows = IA_MIN_ROWS; rows * columns <= IA_MAX_PER_PAGE; rows += 1) {
    options.push(rows * columns);
  }
  return options;
}

/**
 * Snap an arbitrary page size to the nearest multiple of `columns`
 * (prefers the closer of round-down / round-up; ties round up).
 */
export function alignPerPageToGrid(perPage: number, columns: number): number {
  if (columns <= 1) return Math.max(1, perPage);
  if (perPage <= 0) return getAdaptiveDefaultPerPage(columns);

  const remainder = perPage % columns;
  if (remainder === 0) return perPage;

  const down = perPage - remainder;
  const up = perPage + (columns - remainder);
  const distDown = remainder;
  const distUp = columns - remainder;

  let aligned = distUp <= distDown ? up : down;
  if (aligned < columns * IA_MIN_ROWS) aligned = columns * IA_MIN_ROWS;

  const max = IA_MAX_PER_PAGE;
  if (aligned > max) {
    aligned = Math.floor(max / columns) * columns;
  }
  return Math.max(columns * IA_MIN_ROWS, aligned);
}

/** Pick a supported option closest to `perPage`, or align dynamically. */
export function snapInsightsPerPage(
  perPage: number,
  columns: number,
  options: number[]
): number {
  const aligned = alignPerPageToGrid(perPage, columns);
  if (options.includes(aligned)) return aligned;
  if (options.length === 0) return getAdaptiveDefaultPerPage(columns);

  let best = options[0]!;
  let bestDist = Math.abs(best - perPage);
  for (const n of options) {
    const d = Math.abs(n - perPage);
    if (d < bestDist) {
      best = n;
      bestDist = d;
    }
  }
  return best;
}
