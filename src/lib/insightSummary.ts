/** Summary parsing — mirrors article page / InsightsCard logic. */

export function extractSummaryItemsFromHtml(html: string): string[] {
  const trimmed = (html || "").trim();
  if (!trimmed) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<div id="__sr__">${trimmed}</div>`,
      "text/html"
    );
    const root = doc.getElementById("__sr__");
    if (!root) return [trimmed];
    const liEls = Array.from(root.querySelectorAll("li"));
    if (liEls.length > 0)
      return liEls.map((li) => (li.innerHTML || "").trim()).filter(Boolean);
    const pEls = Array.from(root.querySelectorAll("p"));
    if (pEls.length > 0)
      return pEls.map((p) => (p.innerHTML || "").trim()).filter(Boolean);
    const children = Array.from(root.children);
    if (children.length > 0)
      return children.map((el) => (el.innerHTML || "").trim()).filter(Boolean);
    const text = (root.textContent || "").trim();
    return text ? [text] : [];
  } catch {
    return [trimmed];
  }
}

export function parseSummaryItems(val: unknown): string[] {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) {
    const items = (val as unknown[])
      .map((x) => (typeof x === "string" ? x : String(x)))
      .map((s) => s.trim())
      .filter(Boolean);
    return items
      .flatMap((s) => (s.includes("<") ? extractSummaryItemsFromHtml(s) : [s]))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseSummaryItems(parsed);
    } catch {
      /* not JSON */
    }
    const htmlItems = extractSummaryItemsFromHtml(trimmed);
    if (htmlItems.length > 1) return htmlItems;
    if (htmlItems.length === 1) {
      const lines = htmlItems[0]
        .split(/\r?\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length > 1) return lines;
      return htmlItems;
    }
    const lines = trimmed
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : [trimmed];
  }
  return [];
}

export function hasInsightSummary(summary: unknown): boolean {
  return parseSummaryItems(summary).length > 0;
}
