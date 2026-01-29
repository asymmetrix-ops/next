export interface ExportableArticle {
  id?: number;
  Headline?: string;
  Strapline?: string;
  Publication_Date?: string;
  Content_Type?: string;
  content_type?: string;
  Content?: { Content_type?: string; Content_Type?: string };
  Body?: string;
  Company_of_Focus?: unknown;
  sectors?:
    | Array<{
        id?: number | string;
        sector_id?: number | string;
        Sector_id?: number | string;
        sector_name?: string;
        Sector_importance?: string;
      }>
    | string;
  companies_mentioned?: Array<{ id?: number; name?: string }> | string;
  Related_Corporate_Event?:
    | Array<{
        id?: number;
        description?: string;
        deal_type?: string;
        deal_status?: string;
        announcement_date?: string;
        target?: {
          id?: number;
          name?: string;
          primary_sectors?: Array<{ id?: number; sector_name?: string }>;
          secondary_sectors?: Array<{ id?: number; sector_name?: string }>;
        };
        advisors?: Array<{ _new_company?: { id?: number; name?: string } }>;
        primary_sectors?: Array<{ id?: number; sector_name?: string }>;
        secondary_sectors?: Array<{ id?: number; sector_name?: string }>;
      }>
    | string;
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

let html2pdfLoaded: Promise<void> | null = null;

function ensureHtml2Pdf(): Promise<void> {
  // Already present
  if (
    typeof (window as unknown as { html2pdf?: unknown }).html2pdf !==
    "undefined"
  ) {
    return Promise.resolve();
  }
  if (html2pdfLoaded) return html2pdfLoaded;
  html2pdfLoaded = new Promise<void>((resolve, reject) => {
    try {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load html2pdf"));
      document.head.appendChild(script);
    } catch (e) {
      reject(e as Error);
    }
  });
  return html2pdfLoaded;
}

/**
 * Generate PDF and return blob URL for embedding (LinkedIn-style viewer).
 * Returns null on failure.
 */
export async function generateArticlePdfBlobUrl(
  article: ExportableArticle
): Promise<string | null> {
  try {
    const ct = (
      article.Content_Type ||
      article.content_type ||
      article.Content?.Content_type ||
      article.Content?.Content_Type ||
      ""
    ).trim();

    const safeParse = <T>(v: unknown): T | undefined => {
      if (Array.isArray(v)) return v as unknown as T;
      if (typeof v === "string" && v.trim()) {
        try {
          return JSON.parse(v) as T;
        } catch {
          return undefined;
        }
      }
      return undefined;
    };

    const sectors =
      safeParse<
        Array<{
          id?: number | string;
          sector_id?: number | string;
          Sector_id?: number | string;
          sector_name?: string;
          Sector_importance?: string;
        }>
      >(article.sectors) || [];
    const companies =
      safeParse<Array<{ id?: number; name?: string }>>(
        article.companies_mentioned
      ) || [];
    const relatedEvents =
      safeParse<
        Array<{
          id?: number;
          description?: string;
          deal_type?: string;
          deal_status?: string;
          announcement_date?: string;
          target?: { id?: number; name?: string };
          advisors?: Array<{ _new_company?: { id?: number; name?: string } }>;
          primary_sectors?: Array<{ id?: number; sector_name?: string }>;
          secondary_sectors?: Array<{ id?: number; sector_name?: string }>;
        }>
      >(article.Related_Corporate_Event) || [];

    const getSectorId = (s: unknown): number | undefined => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sectorAny = s as any;
      const candidate =
        sectorAny?.id ?? sectorAny?.sector_id ?? sectorAny?.Sector_id;
      if (typeof candidate === "number") return candidate;
      if (typeof candidate === "string") {
        const parsed = parseInt(candidate, 10);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    // Determine if Company_of_Focus is populated (convert to boolean)
    const hasCompanyOfFocus =
      article.Company_of_Focus != null && article.Company_of_Focus !== "";

    const payload = {
      id: article.id,
      Headline: article.Headline || "",
      Strapline: article.Strapline || undefined,
      Publication_Date: article.Publication_Date || "",
      Content_Type: ct,
      Company_of_Focus: hasCompanyOfFocus,
      Body: article.Body || "",
      companies_mentioned: companies
        .map((c) => ({ id: c?.id, name: c?.name }))
        .filter((c) => (c?.name || "").trim()),
      sectors: sectors
        .map((s) => ({
          id: getSectorId(s),
          sector_name: (s as { sector_name?: string })?.sector_name,
          Sector_importance: (s as { Sector_importance?: string })
            ?.Sector_importance,
        }))
        .filter((s) => (s.sector_name || "").trim()),
      Related_Corporate_Event: relatedEvents.map((e) => ({
        id: e?.id,
        description: e?.description,
        announcement_date: e?.announcement_date,
        deal_type: e?.deal_type,
        target: e?.target?.name
          ? { id: e?.target?.id, name: e?.target?.name }
          : undefined,
        advisors: e?.advisors,
        primary_sectors: e?.primary_sectors,
        secondary_sectors: e?.secondary_sectors,
      })),
    };

    const endpoint =
      (typeof process !== "undefined" &&
        (process as unknown as { env?: { [k: string]: string | undefined } })
          .env?.NEXT_PUBLIC_PDF_SERVICE_URL) ||
      "https://asymmetrix-pdf-service.fly.dev/api/export-article-pdf";

    // Log payload and endpoint to browser console
    try {
      // eslint-disable-next-line no-console
      console.log("[PDF Export] POST", endpoint, { ...payload });
    } catch {}

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.error("[PDF Export] Service error:", err);
  }
  return null;
}

export async function openArticlePdfWindow(article: ExportableArticle) {
  // Prefer external PDF service; fallback to client-side html2pdf on failure.
  const blobUrl = await generateArticlePdfBlobUrl(article);
  if (blobUrl) {
    const a = document.createElement("a");
    a.href = blobUrl;
    
    // Extract company/subject name from headline (e.g., "Company Analysis – FromCounsel" -> "FromCounsel")
    const headlineParts = (article.Headline || "").split(/\s*[–—-]\s*/);
    const subjectName = headlineParts.length > 1 
      ? headlineParts.slice(1).join(" - ").trim() 
      : (article.Headline || "Document");
    
    const ct = (
      article.Content_Type ||
      article.content_type ||
      article.Content?.Content_type ||
      article.Content?.Content_Type ||
      ""
    ).trim();
    
    // Format: "Asymmetrix - [Content Type] - [Content Title]"
    const filenameBase = ct && subjectName
      ? `Asymmetrix - ${ct} - ${subjectName}`
      : `Asymmetrix - ${(article.Headline || "Article").toString()}`;
    
    a.download = `${filenameBase
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    return;
  }
  // Fallback to client-side generation if service failed
  const ct = (
    article.Content_Type ||
    article.content_type ||
    article.Content?.Content_type ||
    article.Content?.Content_Type ||
    ""
  ).trim();

  const safeParse = <T>(v: unknown): T | undefined => {
    if (Array.isArray(v)) return v as unknown as T;
    if (typeof v === "string" && v.trim()) {
      try {
        return JSON.parse(v) as T;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };
  const sectors =
    safeParse<
      Array<{
        id?: number | string;
        sector_id?: number | string;
        Sector_id?: number | string;
        sector_name?: string;
        Sector_importance?: string;
      }>
    >(article.sectors) || [];
  const companies =
    safeParse<Array<{ id?: number; name?: string }>>(
      article.companies_mentioned
    ) || [];
  const relatedEvents =
    safeParse<
      Array<{
        id?: number;
        description?: string;
        deal_type?: string;
        deal_status?: string;
        announcement_date?: string;
        target?: {
          id?: number;
          name?: string;
          primary_sectors?: Array<{ id?: number; sector_name?: string }>;
          secondary_sectors?: Array<{ id?: number; sector_name?: string }>;
        };
        investment_data?: {
          Funding_stage?: string;
          funding_stage?: string;
        };
        advisors?: Array<{ _new_company?: { id?: number; name?: string } }>;
        primary_sectors?: Array<{ id?: number; sector_name?: string }>;
        secondary_sectors?: Array<{ id?: number; sector_name?: string }>;
      }>
    >(article.Related_Corporate_Event) || [];

  const title = `Asymmetrix – ${ct || "Article"} – ${
    article.Headline || "Untitled"
  }`;
  const pdfFilename = (() => {
    // Extract company/subject name from headline (e.g., "Company Analysis – FromCounsel" -> "FromCounsel")
    const headlineParts = (article.Headline || "").split(/\s*[–—-]\s*/);
    const subjectName = headlineParts.length > 1 
      ? headlineParts.slice(1).join(" - ").trim() 
      : (article.Headline || "Document");
    
    // Format: "Asymmetrix - [Content Type] - [Content Title]"
    const base = ct && subjectName
      ? `Asymmetrix - ${ct} - ${subjectName}`
      : `Asymmetrix - ${(article.Headline || "Article").toString()}`;
    
    // Sanitize filename for cross-platform safety
    const sanitized = base
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    return `${sanitized}.pdf`;
  })();

  const baseUrl =
    (typeof window !== "undefined" && window.location?.origin) || "";
  const logoUrl = `${baseUrl}/icons/logo.svg`;

  // (legacy list HTML removed; using tag-style rendering at bottom)

  const isHotTake = /^(hot\s*take)$/i.test(ct);
  const relatedCardsHtml = isHotTake
    ? relatedEvents
        .map((e) => {
          const id = typeof e?.id === "number" ? e.id : undefined;
          const desc = (e?.description || "Related corporate event").trim();
          const safeHref = id
            ? `${baseUrl}/corporate-event/${id}`
            : `${baseUrl}/corporate-events?search=${encodeURIComponent(desc)}`;
          const date = e?.announcement_date
            ? formatDate(e.announcement_date)
            : "Not available";
          const type = (e?.deal_type || "Not available").trim();
          const fundingStage =
            (
              (e as {
                investment_data?: {
                  Funding_stage?: string;
                  funding_stage?: string;
                };
              })?.investment_data?.Funding_stage ||
              (e as {
                investment_data?: {
                  Funding_stage?: string;
                  funding_stage?: string;
                };
              })?.investment_data?.funding_stage ||
              ""
            ).trim();
          const targetName =
            (e as { target?: { name?: string } })?.target?.name ||
            "Not available";
          const advisorNames = Array.isArray(
            (e as { advisors?: Array<{ _new_company?: { name?: string } }> })
              .advisors
          )
            ? (
                (
                  e as {
                    advisors?: Array<{ _new_company?: { name?: string } }>;
                  }
                ).advisors || []
              )
                .map((a) => a?._new_company?.name)
                .filter(Boolean)
                .join(", ") || "Not available"
            : "Not available";
          const primNames = Array.isArray(
            (e as { primary_sectors?: Array<{ sector_name?: string }> })
              .primary_sectors
          )
            ? (
                (e as { primary_sectors?: Array<{ sector_name?: string }> })
                  .primary_sectors || []
              )
                .map((s) => s?.sector_name)
                .filter(Boolean)
                .join(", ") || "Not available"
            : "Not available";
          const secNames = Array.isArray(
            (e as { secondary_sectors?: Array<{ sector_name?: string }> })
              .secondary_sectors
          )
            ? (
                (e as { secondary_sectors?: Array<{ sector_name?: string }> })
                  .secondary_sectors || []
              )
                .map((s) => s?.sector_name)
                .filter(Boolean)
                .join(", ") || "Not available"
            : "Not available";
          return `
            <div class=\"rce-card avoid-break\">
              <div class=\"rce-title-row\">
                <a href=\"${safeHref}\" class=\"rce-title\">${escapeHtml(
            desc
          )}</a>
                <span class=\"rce-meta\">${escapeHtml(date)}</span>
              </div>
              <div class=\"rce-grid\">
                <div class=\"rce-item\"><span class=\"rce-label\">Target:</span><span class=\"rce-value\">${escapeHtml(
                  targetName
                )}</span></div>
                <div class=\"rce-item\"><span class=\"rce-label\">Deal Type:</span><span class=\"rce-value\"><span class=\"pill pill-blue\">${escapeHtml(
                  type
                )}</span>${
                  fundingStage
                    ? ` <span class=\"pill pill-blue\">${escapeHtml(
                        fundingStage
                      )}</span>`
                    : ""
                }</span></div>
                <div class=\"rce-item\"><span class=\"rce-label\">Advisors:</span><span class=\"rce-value\">${escapeHtml(
                  advisorNames
                )}</span></div>
                <div class=\"rce-item\"><span class=\"rce-label\">Primary:</span><span class=\"rce-value\">${escapeHtml(
                  primNames
                )}</span></div>
                <div class=\"rce-item\"><span class=\"rce-label\">Secondary:</span><span class=\"rce-value\">${escapeHtml(
                  secNames
                )}</span></div>
              </div>
            </div>
          `;
        })
        .filter(Boolean)
        .join("")
    : "";

  const articleBodyHtml = article.Body || "";

  const getSectorId = (s: unknown): number | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectorAny = s as any;
    const candidate =
      sectorAny?.id ?? sectorAny?.sector_id ?? sectorAny?.Sector_id;
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string") {
      const parsed = parseInt(candidate, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const companiesTagsHtml = companies
    .map((c) => {
      const name = (c?.name || "").trim();
      if (!name) return "";
      const id = typeof c?.id === "number" ? c.id : undefined;
      const href = id ? `${baseUrl}/company/${id}` : undefined;
      return href
        ? `<a href="${href}" class="tag companyTag">${escapeHtml(name)}</a>`
        : `<span class="tag companyTag">${escapeHtml(name)}</span>`;
    })
    .filter(Boolean)
    .join("");

  const sectorsTagsHtml = sectors
    .map((s) => {
      const name = (s?.sector_name || "").trim();
      if (!name) return "";
      const id = getSectorId(s);
      const href =
        typeof id === "number" ? `${baseUrl}/sector/${id}` : undefined;
      const label = `${escapeHtml(name)}${
        (s?.Sector_importance || "").trim() === "Primary" ? " (Primary)" : ""
      }`;
      return href
        ? `<a href="${href}" class="tag sectorTag">${label}</a>`
        : `<span class="tag sectorTag">${label}</span>`;
    })
    .filter(Boolean)
    .join("");

  const styleCss = `
      @page { size: A4; margin: 16mm 0 0 0; }
      @page :first { margin-top: 0; }
      :root { --text:#0b1020; --muted:#5a6272; --brand:#0a66da; --rule:#e7e9ee; }
      .pdf-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: var(--text); }
      .page { width: 200mm; min-height: 297mm; box-sizing: border-box; padding: 36mm 18mm 36mm 12mm; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
      .brand-row { display:flex; align-items:center; gap:14px; margin-bottom: 2px; }
      .logo { height: 96px !important; width: 96px !important; display:inline-block; }
      .brand { font-weight: 800; letter-spacing: 0.5px; font-size: 28px; color: var(--brand); text-transform: uppercase; }
      .title { font-size: 24px; font-weight: 800; margin: 4px 0 8px 0; line-height: 1.25; }
      .strapline { font-size: 13px; color: var(--muted); margin: 0 0 12px 0; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 10px 0 18px; }
      .meta-block { border: 1px solid var(--rule); border-radius: 8px; padding: 10px 12px; }
      .meta-title { font-size: 12px; font-weight: 700; margin: 0 0 6px 0; }
      .meta ul { margin: 0; padding-left: 18px; }
      .section-title { font-size: 16px; font-weight: 800; margin: 22px 0 10px; break-after: avoid; page-break-after: avoid; }
      .content { font-size: 16px !important; line-height: 1.65; word-break: break-word; overflow-wrap: anywhere; }
      .content p, .content li { font-size: 16px !important; margin: 0 0 12px 0; page-break-inside: avoid; break-inside: avoid; orphans: 3; widows: 3; }
      .content ul { margin: 0 0 10px 18px; }
      .content ol { margin: 0 0 10px 18px; }
      .content h1,.content h2,.content h3 { margin: 16px 0 10px; break-after: avoid; page-break-after: avoid; }
      .rule { height: 1px; background: var(--rule); border: 0; margin: 14px 0; }
      .footer { margin-top: 22px; font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; }
      .badge { display:inline-block; font-size:10px; color:#1e40af; background:#eff6ff; border:1px solid #bfdbfe; border-radius:999px; padding:4px 8px; font-weight:700; }
      .tag-container { display:flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 2px 0; }
      .tag { display:inline-block; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; }
      .companyTag { background-color: #e8f5e8; color: #2e7d32; }
      .sectorTag { background-color: #f3e5f5; color: #7b1fa2; }
      a.tag { text-decoration: none; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; -webkit-region-break-inside: avoid; }
      .section-block { margin: 18px 0 26px 0; }
      .rce-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin: 10px 0; }
      .rce-title-row { display:flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
      .rce-title { color: #0075df; text-decoration: underline; font-weight: 700; }
      .rce-meta { color: #4a5568; font-size: 12px; }
      .rce-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
      .rce-item { display:flex; align-items: center; gap: 6px; }
      .rce-label { font-weight: 700; color: #374151; font-size: 12px; }
      .rce-value { color: #4a5568; font-size: 12px; }
      .pill { display: inline-block; padding: 2px 8px; font-size: 11px; border-radius: 999px; font-weight: 700; }
      .pill-blue { background-color: #e6f0ff; color: #1d4ed8; }
  `;

  const bodyHtml = `
    <div class="pdf-root">
      <div class="page">
      <div class="header avoid-break">
        <div>
          <div class="brand-row">
            <img class="logo" alt="Asymmetrix" src="${escapeHtml(
              logoUrl
            )}" crossorigin="anonymous" width="96" height="96" style="width:96px;height:96px;display:inline-block;" />
            <div class="brand">Asymmetrix</div>
          </div>
          <div class="title">${escapeHtml(title)}</div>
          ${ct ? `<span class="badge">${escapeHtml(ct)}</span>` : ""}
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px; color: var(--muted);">Published</div>
          <div style="font-size:12.5px; font-weight:700;">${escapeHtml(
            formatDate(article.Publication_Date)
          )}</div>
        </div>
      </div>
      ${
        article.Strapline
          ? `<div class="strapline avoid-break">${escapeHtml(
              article.Strapline
            )}</div>`
          : ""
      }
      <hr class="rule" />

      ${
        isHotTake && relatedCardsHtml
          ? `
        <div class="section-block">
          <div class="meta-title">Related Corporate Event</div>
          ${relatedCardsHtml}
        </div>
      `
          : ``
      }

      <div class="content">${articleBodyHtml}</div>

      <div class="section-block avoid-break">
        <div class="section-title">Companies</div>
        <div class="tag-container">
          ${
            companiesTagsHtml ||
            `<span style="color:var(--muted);">Not available</span>`
          }
        </div>
      </div>

      <div class="section-block avoid-break">
        <div class="section-title">Sectors</div>
        <div class="tag-container">
          ${
            sectorsTagsHtml ||
            `<span style=\"color:var(--muted);\">Not available</span>`
          }
        </div>
      </div>

      <div class="footer">
        <div>Asymmetrix – Insights & Analysis</div>
        <div>${new Date().toLocaleDateString()}</div>
      </div>
      </div>
    </div>`;

  await ensureHtml2Pdf();
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "210mm";
  host.style.backgroundColor = "#ffffff";
  host.innerHTML = `<style>${styleCss}</style>${bodyHtml}`;
  document.body.appendChild(host);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h2p: any = (window as unknown as { html2pdf?: unknown }).html2pdf;
  if (typeof h2p === "function") {
    const opt = {
      margin: 0,
      filename: pdfFilename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: [".avoid-break"] },
    } as Record<string, unknown>;
    await h2p()
      .set(opt)
      .from(host.querySelector(".page") as HTMLElement)
      .save();
  }
  try {
    document.body.removeChild(host);
  } catch {}
}
