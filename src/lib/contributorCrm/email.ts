function isEmptyParagraph(el: Element): boolean {
  if (el.tagName !== "P") return false;
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("br").forEach((br) => br.remove());
  const text = (clone.textContent ?? "").replace(/\u00a0/g, " ").trim();
  return text === "";
}

/** Remove trailing empty paragraphs (common Tiptap artifact from clicking below content). */
export function trimTrailingEmptyBlocks(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  while (div.lastElementChild && isEmptyParagraph(div.lastElementChild)) {
    div.lastElementChild.remove();
  }
  return div.innerHTML || "<p></p>";
}

/**
 * Sanitize body HTML: strip scripts, event handlers, javascript: URLs.
 */
export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  const scripts = div.querySelectorAll("script");
  scripts.forEach((s) => s.remove());
  div.querySelectorAll("hr").forEach((hr) => hr.remove());
  const all = div.querySelectorAll("*");
  all.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      if (
        attr.name === "href" ||
        attr.name === "src"
      ) {
        const v = attr.value || "";
        if (v.replace(/\s/g, "").toLowerCase().startsWith("javascript:")) {
          el.setAttribute(attr.name as "href" | "src", "#");
        }
      }
    });
  });
  return trimTrailingEmptyBlocks(div.innerHTML);
}

/**
 * Build full branded email HTML (doctype, head, styles, body wrapper).
 */
export function buildBrandedEmailHtml({
  bodyHtml,
  subject,
}: {
  bodyHtml: string;
  subject: string;
}): string {
  const escapedTitle = subject
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapedTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fff; color: #333; margin: 0; padding: 0; }
    a { color: #1a73e8; }
    .container { max-width: 720px; margin: 0 auto; padding: 16px 24px; }
    .email-body p { margin: 0 0 12px 0; padding: 0; }
    .email-body p:first-child { margin-top: 0; }
    .email-body hr { display: none; height: 0; margin: 0; border: 0; }
    .card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge.hot-take { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
    .company-analysis { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
    .deal-brief { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
    .market-map { background: #e0e7ff; color: #3730a3; border: 1px solid #6366f1; }
    .default { background: #f3f4f6; color: #374151; border: 1px solid #9ca3af; }
    .email-body table { border-collapse: collapse; width: 100%; }
    /* Presentation / layout tables: no grid lines (avoids stray horizontal rules). */
    .email-body table[role="presentation"] th,
    .email-body table[role="presentation"] td {
      border: none !important;
      padding: 0;
    }
    /* Optional explicit data tables in the editor body */
    .email-body table.email-data-table th,
    .email-body table.email-data-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .email-body table.email-data-table th {
      background: #f9fafb;
      font-weight: 600;
    }
    @media (max-width: 600px) {
      .email-body table.email-data-table thead { display: none; }
      .email-body table.email-data-table tr,
      .email-body table.email-data-table td { display: block; }
      .email-body table.email-data-table td { border-bottom: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border: 0; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 8px 0; border: 0; margin: 0; vertical-align: top;">
        <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 720px; margin: 0 auto; border-collapse: collapse; border: 0;">
          <tr>
            <td class="email-body" style="border: 0; padding: 0; vertical-align: top;">${bodyHtml}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Extract inner content from a full branded email HTML (e.g. container td) for loading into editor.
 */
function unwrapNestedEmailBody(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  const nestedBody = div.querySelector(".container .email-body, table .email-body");
  if (nestedBody && div.childElementCount === 1) {
    return nestedBody.innerHTML.trim();
  }
  return html.trim();
}

export function extractInnerContent(fullHtml: string): string {
  if (typeof document === "undefined") return fullHtml;
  const div = document.createElement("div");
  div.innerHTML = fullHtml;

  const emailBody = div.querySelector(".email-body");
  if (emailBody) {
    return trimTrailingEmptyBlocks(
      unwrapNestedEmailBody(emailBody.innerHTML.trim())
    );
  }

  const container = div.querySelector(".container");
  const containerBody =
    container?.querySelector(".email-body") ?? container?.querySelector("td");
  if (containerBody) {
    return trimTrailingEmptyBlocks(containerBody.innerHTML.trim());
  }

  const td = div.querySelector("td");
  if (td) return trimTrailingEmptyBlocks(td.innerHTML.trim());

  return trimTrailingEmptyBlocks(fullHtml.trim());
}

export type EmbeddedLink = {
  index: number;
  href: string;
  text: string;
};

export function extractEmbeddedLinks(html: string): EmbeddedLink[] {
  if (typeof document === "undefined") return [];
  const div = document.createElement("div");
  div.innerHTML = html;
  return Array.from(div.querySelectorAll("a[href]")).map((anchor, index) => ({
    index,
    href: anchor.getAttribute("href") ?? "",
    text: anchor.textContent ?? "",
  }));
}

export function updateEmbeddedLink(
  html: string,
  linkIndex: number,
  updates: { href?: string; text?: string }
): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  const anchors = Array.from(div.querySelectorAll("a[href]"));
  const anchor = anchors[linkIndex];
  if (!anchor) return html;
  if (updates.href !== undefined) {
    anchor.setAttribute("href", updates.href);
  }
  if (updates.text !== undefined) {
    anchor.textContent = updates.text;
  }
  return div.innerHTML;
}

const COMPANY_PAGE_PATH_RE = /^(\/contributor-crm\/)(\d+)(\/.*)?$/;

function rewriteCompanyPath(
  pathname: string,
  targetCompanyId: string
): { pathname: string; changed: boolean } {
  const match = pathname.match(COMPANY_PAGE_PATH_RE);
  if (!match) return { pathname, changed: false };
  return {
    pathname: `${match[1]}${targetCompanyId}${match[3] ?? ""}`,
    changed: true,
  };
}

function rewriteCompanyQuery(
  search: string,
  targetCompanyId: string
): { search: string; changed: boolean } {
  if (!search) return { search, changed: false };
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const existing = params.get("companyId") ?? "";
  if (!/^\d+$/.test(existing)) return { search, changed: false };
  params.set("companyId", targetCompanyId);
  const next = params.toString();
  return { search: next ? `?${next}` : "", changed: true };
}

/** Rewrite contributor company page URLs to a different company id. */
export function rewriteCompanyPageUrl(
  url: string,
  targetCompanyId: number | string
): string {
  if (!url || url.includes("{{")) return url;
  if (/asymmetrixintelligence\.com\/insights\//i.test(url)) return url;
  if (/^(?:mailto|tel):/i.test(url)) return url;

  const targetId = String(targetCompanyId);

  try {
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url);
      const path = rewriteCompanyPath(parsed.pathname, targetId);
      const query = rewriteCompanyQuery(parsed.search, targetId);
      if (!path.changed && !query.changed) return url;
      parsed.pathname = path.pathname;
      parsed.search = query.search;
      return parsed.toString();
    }

    const hashIndex = url.indexOf("#");
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
    const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const qIndex = withoutHash.indexOf("?");
    const pathPart = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
    const queryPart = qIndex >= 0 ? withoutHash.slice(qIndex) : "";
    const path = rewriteCompanyPath(pathPart, targetId);
    const query = rewriteCompanyQuery(queryPart, targetId);
    if (!path.changed && !query.changed) return url;
    return `${path.pathname}${query.search}${hash}`;
  } catch {
    return url;
  }
}

/** Rewrite all contributor company page links in email body HTML. */
export function rewriteCompanyPageUrls(
  html: string,
  targetCompanyId: number | string
): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;

  for (const attr of ["href", "src"] as const) {
    div.querySelectorAll(`[${attr}]`).forEach((el) => {
      const value = el.getAttribute(attr);
      if (!value) return;
      const rewritten = rewriteCompanyPageUrl(value, targetCompanyId);
      if (rewritten !== value) el.setAttribute(attr, rewritten);
    });
  }

  return div.innerHTML;
}

export const EMAIL_PREVIEW_STORAGE_KEY = "asymmetrix_email_preview_v1";

export type EmailPreviewPayload = {
  created_at: number;
  subject: string;
  html: string;
  to?: string;
  toName?: string;
  from?: string;
  fromName?: string;
};
