/** Decode common HTML entities from API text fields (e.g. C&amp;C → C&C). */
export function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = input;
    return (div.textContent || div.innerText || "").trim();
  }
  return input
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}
