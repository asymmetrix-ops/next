/** Column / filter labels are written with "($m)"; show the user's platform currency symbol instead (e.g. "(€m)"). */
export function localizeCompsLabel(label: string, symbol: string): string {
  return label.replace("($m)", `(${symbol}m)`);
}
