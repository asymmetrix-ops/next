/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const article = (await req.json()) as {
      Headline?: string;
      Strapline?: string;
      Publication_Date?: string;
      Content_Type?: string;
      content_type?: string;
      Content?: { Content_type?: string; Content_Type?: string };
      Body?: string;
      sectors?:
        | Array<{ sector_name?: string; Sector_importance?: string }>
        | string;
      companies_mentioned?: Array<{ id?: number; name?: string }> | string;
      Related_Corporate_Event?:
        | Array<{
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
        | string;
    };

    // Dynamic import to keep edge/webpack happy if module not installed
    let puppeteer: any = null;
    try {
      puppeteer = await (eval("import('puppeteer')") as Promise<any>);
    } catch {
      return new Response("Puppeteer not installed", { status: 501 });
    }

    const escapeHtml = (str: string) =>
      (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const ct = (
      article.Content_Type ||
      article.content_type ||
      article.Content?.Content_type ||
      article.Content?.Content_Type ||
      ""
    ).trim();

    const sectors = Array.isArray(article.sectors)
      ? article.sectors
      : (() => {
          try {
            return JSON.parse((article.sectors as string) || "[]");
          } catch {
            return [] as Array<{
              sector_name?: string;
              Sector_importance?: string;
            }>;
          }
        })();
    const companies = Array.isArray(article.companies_mentioned)
      ? article.companies_mentioned
      : (() => {
          try {
            return JSON.parse((article.companies_mentioned as string) || "[]");
          } catch {
            return [] as Array<{ id?: number; name?: string }>;
          }
        })();
    const relatedEvents = Array.isArray(article.Related_Corporate_Event)
      ? article.Related_Corporate_Event
      : (() => {
          try {
            return JSON.parse(
              (article.Related_Corporate_Event as string) || "[]"
            );
          } catch {
            return [] as Array<unknown>;
          }
        })();

    const logoUrl = `${req.nextUrl.origin}/icons/logo.svg`;

    const sectorsHtml = (sectors || [])
      .map((s: any) => {
        const name = (s?.sector_name || "").trim();
        const imp = (s?.Sector_importance || "").trim();
        return name
          ? `<span class="tag sectorTag">${escapeHtml(name)}${
              imp === "Primary" ? " (Primary)" : ""
            }</span>`
          : "";
      })
      .filter(Boolean)
      .join("");

    const companiesHtml = (companies || [])
      .map((c: any) =>
        c?.name
          ? `<span class="tag companyTag">${escapeHtml(c.name!)}</span>`
          : ""
      )
      .filter(Boolean)
      .join("");

    const relatedHtml = (relatedEvents as Array<any>)
      .map((e: any) => {
        const desc = (e?.description || "Related corporate event").trim();
        const date = e?.announcement_date
          ? new Date(e.announcement_date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Not available";
        const type = (e?.deal_type || "Not available").trim();
        const target = e?.target?.name || "Not available";
        const advisors = Array.isArray(e?.advisors)
          ? (e.advisors || [])
              .map((a: any) => a?._new_company?.name)
              .filter(Boolean)
              .join(", ") || "Not available"
          : "Not available";
        const prim = Array.isArray(e?.primary_sectors)
          ? (e.primary_sectors || [])
              .map((s: any) => s?.sector_name)
              .filter(Boolean)
              .join(", ") || "Not available"
          : "Not available";
        const sec = Array.isArray(e?.secondary_sectors)
          ? (e.secondary_sectors || [])
              .map((s: any) => s?.sector_name)
              .filter(Boolean)
              .join(", ") || "Not available"
          : "Not available";
        return `
        <div class="rce-card">
          <div class="rce-title">${escapeHtml(desc)}</div>
          <div class="rce-grid">
            <div><b>Date:</b> ${escapeHtml(date)}</div>
            <div><b>Deal Type:</b> <span class="pill pill-blue">${escapeHtml(
              type
            )}</span></div>
            <div><b>Target:</b> ${escapeHtml(target)}</div>
            <div><b>Advisors:</b> ${escapeHtml(advisors)}</div>
            <div><b>Primary:</b> ${escapeHtml(prim)}</div>
            <div><b>Secondary:</b> ${escapeHtml(sec)}</div>
          </div>
        </div>`;
      })
      .join("");

    const style = `
      @page { size: A4; margin: 28mm 0 20mm 0; }
      @page :first { margin-top: 14mm; }
      :root { --text:#0b1020; --muted:#5a6272; --brand:#0a66da; --rule:#e7e9ee; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: var(--text); }
      .page { width: 210mm; box-sizing: border-box; padding: 0 20mm; }
      .header { margin: 10mm 0 8mm 0; display:flex; justify-content: space-between; align-items: flex-start; }
      .brand-row { display:flex; align-items:center; gap:8px; }
      .logo { height: 16px; width: 16px; }
      .brand { font-weight: 800; letter-spacing: .3px; font-size: 12px; color: var(--brand); text-transform: uppercase; }
      .title { font-size: 22px; font-weight: 800; margin: 4px 0 8px 0; line-height: 1.25; }
      .badge { display:inline-block; font-size:10px; color:#1e40af; background:#eff6ff; border:1px solid #bfdbfe; border-radius:999px; padding:4px 8px; font-weight:700; }
      .strapline { font-size: 13px; color: var(--muted); margin: 0 0 10px 0; }
      .rule { height: 1px; background: var(--rule); border: 0; margin: 12px 0; }
      .content { font-size: 12.5px; line-height: 1.65; }
      .content p { margin: 0 0 12px 0; page-break-inside: avoid; orphans: 3; widows: 3; }
      .section-title { font-size: 14px; font-weight: 800; margin: 18px 0 8px; break-after: avoid; }
      .tag { display:inline-block; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; }
      .companyTag { background-color: #e8f5e8; color: #2e7d32; }
      .sectorTag { background-color: #f3e5f5; color: #7b1fa2; }
      .rce-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin: 10px 0; }
      .rce-title { font-weight: 700; margin-bottom: 6px; }
      .rce-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 12px; }
      .pill { display: inline-block; padding: 2px 8px; font-size: 11px; border-radius: 999px; font-weight: 700; }
      .pill-blue { background-color: #e6f0ff; color: #1d4ed8; }
    `;

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Asymmetrix – ${escapeHtml(
            article.Headline || "Article"
          )}</title>
          <style>${style}</style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <div class="brand-row">
                  <img class="logo" src="${logoUrl}" alt="Asymmetrix" />
                  <div class="brand">Asymmetrix</div>
                </div>
                <div class="title">Asymmetrix – ${escapeHtml(
                  ct || "Article"
                )} – ${escapeHtml(article.Headline || "Untitled")}</div>
                ${ct ? `<span class="badge">${escapeHtml(ct)}</span>` : ""}
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px; color: var(--muted);">Published</div>
                <div style="font-size:12.5px; font-weight:700;">${escapeHtml(
                  article.Publication_Date || "Not available"
                )}</div>
              </div>
            </div>
            ${
              article.Strapline
                ? `<div class="strapline">${escapeHtml(
                    article.Strapline
                  )}</div>`
                : ""
            }
            <hr class="rule" />

            ${
              relatedHtml
                ? `<div class="section-title">Related Corporate Event</div>${relatedHtml}`
                : ""
            }

            <div class="content">${article.Body || ""}</div>

            <div class="section-title">Companies</div>
            <div>${
              companiesHtml ||
              `<span style='color:var(--muted);'>Not available</span>`
            }</div>

            <div class="section-title">Sectors</div>
            <div>${
              sectorsHtml ||
              `<span style='color:var(--muted);'>Not available</span>`
            }</div>
          </div>
        </body>
      </html>`;

    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: "new" as any,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const filename = `Asymmetrix - ${(article.Headline || "Article")
      .toString()
      .replace(/[\\/:*?"<>|]/g, " ")
      .slice(0, 180)}.pdf`;
    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[export-article-pdf]", e);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}
