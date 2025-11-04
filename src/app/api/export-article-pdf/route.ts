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

    // Dynamic import with fallback to serverless chromium in production
    let puppeteer: any = null;
    let chromiumModule: any | null = null;
    let executablePath: string | undefined;
    let launchArgs: Array<string> = [
      "--allow-file-access-from-files",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--disable-web-security",
    ];
    let importErrorReason = "";
    try {
      // Prefer puppeteer-core + @sparticuz/chromium in serverless
      try {
        const [{ default: puppeteerCore }, chromiumNs] = await Promise.all([
          import("puppeteer-core") as Promise<any>,
          import("@sparticuz/chromium") as Promise<any>,
        ]);
        puppeteer = puppeteerCore;
        const chromiumResolved =
          (chromiumNs && chromiumNs.default) || chromiumNs;
        chromiumModule = chromiumResolved;
        executablePath = await chromiumResolved.executablePath();
        if (Array.isArray(chromiumResolved.args)) {
          launchArgs = chromiumResolved.args.concat(launchArgs);
        }
      } catch (e: unknown) {
        importErrorReason = `serverless-import-failed: ${
          (e as Error)?.message || String(e)
        }`;
        // Fallback: attempt evaluated dynamic imports (some bundlers require this pattern)
        const [{ default: puppeteerCore }, chromiumNs] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - evaluated import to avoid bundling issues
          eval("import('puppeteer-core')") as Promise<any>,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          eval("import('@sparticuz/chromium')") as Promise<any>,
        ]);
        puppeteer = puppeteerCore;
        const chromiumResolved =
          (chromiumNs && chromiumNs.default) || chromiumNs;
        chromiumModule = chromiumResolved;
        executablePath = await chromiumResolved.executablePath();
        if (Array.isArray(chromiumResolved.args)) {
          launchArgs = chromiumResolved.args.concat(launchArgs);
        }
      }
    } catch (e: unknown) {
      importErrorReason = importErrorReason
        ? `${importErrorReason}; fallback-eval-import-failed: ${
            (e as Error)?.message || String(e)
          }`
        : `fallback-eval-import-failed: ${(e as Error)?.message || String(e)}`;
      // Fallback to full puppeteer locally (dev) where Chrome is available
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const mod = await (eval("import('puppeteer')") as Promise<any>);
        puppeteer = mod;
      } catch (e2: unknown) {
        const msg = `Puppeteer not available`;
        const headers = new Headers();
        headers.set(
          "X-PDF-Error",
          (importErrorReason
            ? `${importErrorReason}; puppeteer-fallback-failed: ${
                (e2 as Error)?.message || String(e2)
              }`
            : `puppeteer-fallback-failed: ${
                (e2 as Error)?.message || String(e2)
              }`
          ).slice(0, 512)
        );
        return new Response(msg, { status: 501, headers });
      }
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

    // Decode Unicode escapes in Body content
    const bodyContent = (article.Body || "")
      .replace(/\\u003C/g, "<")
      .replace(/\\u003E/g, ">")
      .replace(/\\u0026/g, "&")
      .replace(/\\u0027/g, "'")
      .replace(/\\u0022/g, '"')
      .replace(/\\r\\n/g, "")
      .replace(/&rsquo;/g, "'")
      .replace(/&ldquo;/g, "\u201C")
      .replace(/&rdquo;/g, "\u201D")
      .replace(/&ndash;/g, "\u2013")
      .replace(/&mdash;/g, "\u2014")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");

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
        :root { --text:#0b1020; --muted:#5a6272; --brand:#0a66da; --rule:#e7e9ee; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
            /* Ensure consistent default font on serverless chrome */
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: var(--text);
            counter-reset: page;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        @page {
          size: A4;
          /* Keep modest margins; do not duplicate with page.pdf margins */
          margin: 10mm 12mm;
        }

        .pdf-page {
          padding: 0;
          width: 210mm;
          min-height: 297mm;
          page-break-after: always;
          position: relative;
          background: white;
        }

        .pdf-page:last-child { page-break-after: auto; }
        .logo-header { 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            margin-bottom: 8mm;
        }
        .logo { width: 16px; height: 16px; }
        .brand { 
            font-weight: 800; 
            letter-spacing: 0.3px; 
            font-size: 12px; 
            color: var(--brand); 
            text-transform: uppercase; 
        }
        .page-header { margin: 0 0 6mm 0; }
        .title { 
            font-size: 22px; 
            font-weight: 800; 
            margin: 4px 0 8px 0; 
            line-height: 1.3;
            page-break-after: avoid;
        }
        .badge { 
            display:inline-block; 
            font-size:10px; 
            color:#1e40af; 
            background:#eff6ff; 
            border:1px solid #bfdbfe; 
            border-radius:999px; 
            padding:4px 8px; 
            font-weight:700; 
        }
        .pub-info { 
            text-align: right; 
            font-size: 12px; 
            color: var(--muted); 
            margin-bottom: 8px;
        }
        .pub-value { 
            text-align: right; 
            font-size: 12.5px; 
            font-weight: 700; 
        }
        .strapline { 
            font-size: 13px; 
            color: var(--muted); 
            margin: 0 0 10px 0;
            page-break-after: avoid;
        }
        .rule { 
            height: 1px; 
            background: var(--rule); 
            border: 0; 
            margin: 12px 0; 
        }
        .content { 
            font-size: 12.5px; 
            line-height: 1.7; 
        }
        .content > *:first-child {
            margin-top: 0 !important;
        }
        .content p { 
            margin: 0 0 14px 0; 
            orphans: 3; 
            widows: 3;
        }
        .content strong {
            font-weight: 700;
        }
        .content em {
            font-style: italic;
        }
        .content ul { 
            margin: 0 0 14px 0; 
            padding-left: 26px; 
            list-style-type: disc;
            list-style-position: outside;
        }
        .content ul ul {
            margin: 6px 0 6px 0;
            list-style-type: circle;
        }
        .content ul ul ul {
            list-style-type: square;
        }
        .content ol { 
            margin: 0 0 14px 0; 
            padding-left: 26px;
            list-style-position: outside;
        }
        .content li { 
            margin: 0 0 8px 0; 
            line-height: 1.7;
            padding-left: 6px;
        }
        .content li:last-child {
            margin-bottom: 0;
        }
        .content li > p {
            margin-bottom: 8px;
        }
        .content li > p:last-child {
            margin-bottom: 0;
        }
        .content h1, .content h2, .content h3, .content h4 {
            page-break-after: avoid;
            margin: 20px 0 12px;
            font-weight: 700;
            line-height: 1.3;
        }
        .content h1 { font-size: 20px; }
        .content h2 { font-size: 18px; }
        .content h3 { font-size: 16px; }
        .content h4 { font-size: 14px; }
        .section-title { 
            font-size: 14px; 
            font-weight: 800; 
            margin: 20px 0 10px;
            page-break-after: avoid;
        }
        .section-block {
            page-break-inside: avoid;
            margin-bottom: 16px;
        }
        .tag-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        }
        .tag { 
            display:inline-block; 
            padding: 6px 10px; 
            border-radius: 6px; 
            font-size: 12px; 
            font-weight: 600; 
            text-decoration: none; 
        }
        .companyTag { background-color: #e8f5e8; color: #2e7d32; }
        .sectorTag { background-color: #f3e5f5; color: #7b1fa2; }
        .rce-card { 
            border: 1px solid #e2e8f0; 
            border-radius: 10px; 
            padding: 12px 14px; 
            margin: 10px 0;
            page-break-inside: avoid;
        }
        .rce-title { font-weight: 700; margin-bottom: 8px; font-size: 13px; }
        .rce-grid { 
            display:grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 8px 16px; 
            font-size: 12px; 
        }
        .pill { 
            display: inline-block; 
            padding: 2px 8px; 
            font-size: 11px; 
            border-radius: 999px; 
            font-weight: 700; 
        }
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
            <div class="pdf-page">
                <div class="logo-header">
                <img class="logo" src="${logoUrl}" alt="Asymmetrix" />
                <div class="brand">Asymmetrix</div>
                </div>
                
                <div class="page-header">
                <div class="title">Asymmetrix – ${escapeHtml(
                  ct || "Article"
                )} – ${escapeHtml(article.Headline || "Untitled")}</div>
                ${ct ? `<span class="badge">${escapeHtml(ct)}</span>` : ""}
                <div class="pub-info">Published: <span class="pub-value">${escapeHtml(
                  article.Publication_Date || "Not available"
                )}</span></div>
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
                    ? `<div class="section-block">
                        <div class="section-title">Related Corporate Event</div>
                        ${relatedHtml}
                    </div>`
                    : ""
                }

                <div class="content">${bodyContent}</div>

                <div class="section-block">
                <div class="section-title">Companies</div>
                <div class="tag-container">${
                  companiesHtml ||
                  `<span style='color:var(--muted);'>Not available</span>`
                }</div>
                </div>

                <div class="section-block">
                <div class="section-title">Sectors</div>
                <div class="tag-container">${
                  sectorsHtml ||
                  `<span style='color:var(--muted);'>Not available</span>`
                }</div>
                </div>
            </div>
            </body>
        </html>`;

    const browser = await puppeteer.launch({
      args: launchArgs,
      executablePath,
      headless: chromiumModule ? chromiumModule.headless : ("new" as any),
      defaultViewport: (chromiumModule && chromiumModule.defaultViewport) || {
        width: 1280,
        height: 900,
        deviceScaleFactor: 2,
      },
    });
    const page = await browser.newPage();
    try {
      await page.emulateMediaType("screen");
    } catch {}
    await page.setContent(html, { waitUntil: "networkidle0" });
    // Ensure styles are applied in serverless Chromium before printing
    try {
      await page.addStyleTag({ content: style });
    } catch {}
    try {
      await page.evaluate(() => {
        const docAny = document as unknown as {
          fonts?: { ready?: Promise<void> };
        };
        return docAny.fonts && docAny.fonts.ready
          ? docAny.fonts.ready
          : Promise.resolve();
      });
    } catch {}
    try {
      await page.waitForTimeout(100);
    } catch {}

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
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
