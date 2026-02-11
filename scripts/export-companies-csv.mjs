#!/usr/bin/env node

/**
 * ============================================================
 *  Asymmetrix — Export Companies to CSV
 * ============================================================
 *
 *  Usage:
 *    node scripts/export-companies-csv.mjs [options]
 *
 *  Options:
 *    --countries "United Kingdom,United States"   Filter by countries (default: United Kingdom)
 *    --output    my-export.csv                    Output filename
 *    --token     YOUR_AUTH_TOKEN                  Bearer token (or env ASYMMETRIX_TOKEN)
 *    --dictionary                                 Also generate a data-dictionary CSV
 *    --horizontal                                 Classic horizontal layout (1 row = 1 company)
 *
 *  Default output is VERTICAL (card) layout — much easier to read.
 *  Add --horizontal for the traditional spreadsheet format.
 *
 *  Examples:
 *    node scripts/export-companies-csv.mjs
 *    node scripts/export-companies-csv.mjs --countries "United Kingdom" --per-page 25
 *    node scripts/export-companies-csv.mjs --horizontal --dictionary
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const API_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies_dynamic_sql";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
//  CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith("--")) {
      const name = key.slice(2);
      if (i + 1 >= argv.length || argv[i + 1].startsWith("--")) {
        args[name] = true;
      } else {
        args[name] = argv[++i];
      }
    }
  }
  return args;
}

const cliArgs = parseArgs(process.argv);

// Requirement: export should be filtered to United Kingdom companies by default
const COUNTRIES = cliArgs.countries
  ? cliArgs.countries.split(",").map((s) => s.trim()).filter(Boolean)
  : ["United Kingdom"];
// Requirement: Always fetch 1 company per request
const PER_PAGE = 1;
const AUTH_TOKEN = cliArgs.token || process.env.ASYMMETRIX_TOKEN || "";
const GENERATE_DICTIONARY = Boolean(cliArgs.dictionary);
const HORIZONTAL = Boolean(cliArgs.horizontal);

const timestamp = new Date().toISOString().slice(0, 10);
const OUTPUT_FILE = path.resolve(
  PROJECT_ROOT,
  cliArgs.output || `companies-export-${timestamp}.csv`
);

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values) {
  return values.map(csvEscape).join(",");
}

function safe(val) {
  return val === null || val === undefined ? "" : val;
}

function formatCurrencyValue(amount, currency, display) {
  const disp = display === null || display === undefined ? "" : String(display).trim();
  if (disp) return disp;

  const amt = amount === null || amount === undefined ? "" : String(amount).trim();
  if (!amt) return "";

  const cur = currency === null || currency === undefined ? "" : String(currency).trim();
  if (!cur) return amt;

  // Avoid double-prefixing if amount already includes currency
  if (amt.toUpperCase().startsWith(cur.toUpperCase())) return amt;
  return `${cur} ${amt}`;
}

function formatSectors(sectors) {
  if (!Array.isArray(sectors) || sectors.length === 0) return "";
  return sectors
    .map((s) => (typeof s === "string" ? s : s?.sector_name ?? ""))
    .filter(Boolean)
    .join("; ");
}

function getManagementRows(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  return roles
    .map((r) => {
      const name = r.Individual_text || r.individual_name || "";
      const titles = Array.isArray(r.job_titles_id)
        ? r.job_titles_id
            .map((t) => (typeof t === "string" ? t : t?.job_title ?? ""))
            .filter(Boolean)
            .join(", ")
        : Array.isArray(r.job_titles)
        ? r.job_titles.join(", ")
        : "";
      return titles ? `${name} — ${titles}` : name;
    })
    .filter(Boolean);
}

function formatManagement(roles) {
  return getManagementRows(roles).join("\n");
}

function getSubsidiaryRows(subs) {
  if (!Array.isArray(subs) || subs.length === 0) return [];
  return subs.map((s) => {
    const name = s.name || "";
    const date = s.acquired_date ? ` (acquired ${s.acquired_date})` : "";
    return `${name}${date}`;
  });
}

function formatSubsidiaries(subs) {
  return getSubsidiaryRows(subs).join("\n");
}

function formatParents(parentObj) {
  const parents = parentObj?.Parant_companies;
  if (!Array.isArray(parents) || parents.length === 0) return "";
  return parents.map((p) => p?.name ?? "").filter(Boolean).join("\n");
}

function formatInvestors(investors) {
  if (!Array.isArray(investors) || investors.length === 0) return "";
  return investors.map((i) => i?.name ?? "").filter(Boolean).join("\n");
}

function decodeHtmlEntities(input) {
  if (!input) return "";
  return String(input)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

// Convert HTML body to readable plain text for CSV/JSON export
function htmlToText(html) {
  if (!html) return "";
  let s = String(html);
  // Preserve basic paragraph breaks
  s = s.replace(/<\s*br\s*\/?>/gi, "\n");
  s = s.replace(/<\/\s*p\s*>/gi, "\n");
  s = s.replace(/<\/\s*div\s*>/gi, "\n");
  // Strip remaining tags
  s = s.replace(/<[^>]*>/g, " ");
  s = decodeHtmlEntities(s);
  // Normalize whitespace
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

// Corporate events as pretty JSON (easy to scan/copy)
function formatEventsJson(events) {
  const arr = Array.isArray(events)
    ? events.map((e) => ({
        id: e?.id ?? null,
        deal_type: e?.deal_type ?? null,
        deal_status: e?.deal_status ?? null,
        announcement_date: e?.announcement_date ?? null,
        closed_date: e?.closed_date ?? null,
        description: e?.description ?? null,
      }))
    : [];
  return prettyJson(arr);
}

// Related content as pretty JSON (easy to scan/copy)
function formatContentJson(articles) {
  const arr = Array.isArray(articles)
    ? articles.map((a) => ({
        id: a?.id ?? null,
        content_type: a?.content_type ?? null,
        visibility: a?.visibility ?? null,
        // Content table fields (when present)
        "Publication Date":
          a?.Publication_Date ?? a?.publication_date ?? a?.PublicationDate ?? null,
        Body: (() => {
          const html = a?.Body ?? a?.body ?? null;
          if (!html) return null;
          return htmlToText(html);
        })(),
        "Body (HTML)": a?.Body ?? a?.body ?? null,
        headline: a?.headline ?? null,
        strapline: a?.strapline ?? null,
      }))
    : [];
  return prettyJson(arr);
}

// ---------------------------------------------------------------------------
//  Column definitions
// ---------------------------------------------------------------------------

const COLUMNS = [
  // ── Company Profile ──
  { header: "Company ID", section: "Company Profile", value: (c) => safe(c.id), description: "Unique numeric identifier for the company in the Asymmetrix database." },
  { header: "Company Name", section: "Company Profile", value: (c) => safe(c.name), description: "Official registered name of the company." },
  { header: "Description", section: "Company Profile", value: (c) => safe(c.description), description: "Free-text summary of what the company does, its history, products, and market position." },
  { header: "Ownership", section: "Company Profile", value: (c) => safe(c.ownership), description: "Ownership structure: Private, Public, Private Equity, Venture Capital, Subsidiary, or Closed." },
  { header: "Website", section: "Company Profile", value: (c) => safe(c.url), description: "The company's own website URL." },
  { header: "Year Founded", section: "Company Profile", value: (c) => safe(c.year_founded), description: "The year the company was originally founded." },
  { header: "Former Names", section: "Company Profile", value: (c) => Array.isArray(c.Former_name) ? c.Former_name.filter(Boolean).join("; ") : "", description: "Any previous names the company traded under." },
  { header: "Country", section: "Company Profile", value: (c) => safe(c.country), description: "Country where the HQ is located." },
  { header: "Province / State", section: "Company Profile", value: (c) => safe(c.province), description: "State, province, or region of HQ." },
  { header: "City", section: "Company Profile", value: (c) => safe(c.city), description: "City of HQ." },
  { header: "Lifecycle Stage", section: "Company Profile", value: (c) => safe(c.Lifecycle_stage?.Lifecycle_Stage), description: "e.g. Startup, Growth, Mature, Private." },
  { header: "Primary Sectors", section: "Company Profile", value: (c) => formatSectors(c.primary_sectors), description: "Main industry sectors the company operates in." },
  { header: "Secondary Sectors", section: "Company Profile", value: (c) => formatSectors(c.secondary_sectors), description: "Additional industry sectors." },
  { header: "Parent Company", section: "Company Profile", value: (c) => formatParents(c.have_parent_company), description: "Name of the parent company, if a subsidiary." },

  // ── Financial Metrics ──
  {
    header: "Revenue (m)",
    section: "Financial Metrics",
    value: (c) =>
      formatCurrencyValue(
        c.revenue_m,
        c.rev_currency,
        c.revenue_display ?? c.Revenue_display ?? null
      ),
    description: "Annual revenue in millions, with currency included (e.g., GBP 5.6).",
  },
  { header: "Revenue Growth %", section: "Financial Metrics", value: (c) => safe(c.rev_growth_pc), description: "Year-over-year revenue growth rate." },
  { header: "Revenue Multiple", section: "Financial Metrics", value: (c) => safe(c.revenue_multiple), description: "EV / Revenue. How the market values each unit of revenue." },
  {
    header: "EBITDA (m)",
    section: "Financial Metrics",
    value: (c) =>
      formatCurrencyValue(
        c.ebitda_m,
        c.ebitda_currency,
        c.ebitda_display ?? c.EBITDA_display ?? null
      ),
    description:
      "Earnings Before Interest, Taxes, Depreciation & Amortisation (millions), with currency included.",
  },
  {
    header: "EBIT (m)",
    section: "Financial Metrics",
    value: (c) =>
      formatCurrencyValue(
        c.ebit_m,
        c.ebit_currency,
        c.ebit_display ?? c.EBIT_display ?? null
      ),
    description: "EBIT (millions), with currency included (when available).",
  },
  { header: "EBITDA Margin %", section: "Financial Metrics", value: (c) => safe(c.ebitda_margin), description: "EBITDA as a % of revenue. Measures operating profitability." },
  {
    header: "Enterprise Value (m)",
    section: "Financial Metrics",
    value: (c) =>
      formatCurrencyValue(
        c.ev,
        c.ev_currency,
        c.enterprise_value_display ?? c.Enterprise_Value_display ?? null
      ),
    description: "Enterprise value in millions, with currency included.",
  },
  { header: "Rule of 40", section: "Financial Metrics", value: (c) => safe(c.rule_of_40), description: "Revenue growth % + EBITDA margin %. SaaS benchmark; >40 is strong." },
  {
    header: "ARR (m)",
    section: "Financial Metrics",
    value: (c) => formatCurrencyValue(c.arr_m, c.arr_currency, null),
    description: "Annual Recurring Revenue in millions, with currency included.",
  },
  { header: "Recurring Revenue %", section: "Financial Metrics", value: (c) => safe(c.arr_pc), description: "% of total revenue that is recurring." },
  { header: "Churn %", section: "Financial Metrics", value: (c) => safe(c.churn_pc), description: "Annual customer/revenue churn rate. Lower is better." },
  { header: "GRR %", section: "Financial Metrics", value: (c) => safe(c.grr_pc), description: "Gross Revenue Retention. 100% = zero churn." },
  { header: "NRR", section: "Financial Metrics", value: (c) => safe(c.nrr), description: "Net Revenue Retention incl. expansions. >100% = existing customers growing." },
  { header: "New Client Revenue Growth %", section: "Financial Metrics", value: (c) => safe(c.new_client_growth_pc), description: "Revenue growth from newly acquired clients." },
  { header: "Number of Clients", section: "Financial Metrics", value: (c) => safe(c.no_of_clients), description: "Number of customers/clients (where tracked)." },
  {
    header: "Revenue per Client",
    section: "Financial Metrics",
    value: (c) => formatCurrencyValue(c.rev_per_client, c.rev_currency, null),
    description: "Average annual revenue per client, with currency included (where tracked).",
  },
  { header: "Number of Employees", section: "Financial Metrics", value: (c) => safe(c.no_employees), description: "Headcount (where tracked)." },
  {
    header: "Revenue per Employee",
    section: "Financial Metrics",
    value: (c) => formatCurrencyValue(c.revenue_per_employee, c.rev_currency, null),
    description: "Average annual revenue per employee, with currency included (where tracked).",
  },
  { header: "Financial Year", section: "Financial Metrics", value: (c) => safe(c.financial_year), description: "Financial year the metrics relate to." },

  // ── People & Investors ──
  { header: "Current Management", section: "People & Investors", value: (c) => formatManagement(c.Managmant_Roles_current), description: "Current leadership: Name — Title(s)." },
  { header: "Past Management", section: "People & Investors", value: (c) => formatManagement(c.Managmant_Roles_past), description: "Former leadership: Name — Title(s)." },
  { header: "Current Investors", section: "People & Investors", value: (c) => formatInvestors(c.investors_current), description: "Investors currently holding a stake." },
  { header: "Past Investors", section: "People & Investors", value: (c) => formatInvestors(c.investors_past), description: "Investors that have exited." },
  { header: "Subsidiaries", section: "People & Investors", value: (c) => formatSubsidiaries(c.have_subsidiaries_companies?.Subsidiaries_companies), description: "Owned companies, with acquisition date." },

  // ── Corporate Events ──
  { header: "Corporate Events (JSON)", section: "Corporate Events", value: (c) => formatEventsJson(c.new_counterparties), description: "Corporate events exported as pretty JSON for readability (one array of objects)." },

  // ── Insights & Analysis ──
  { header: "Insights & Analysis (JSON)", section: "Insights & Analysis", value: (c) => formatContentJson(c.related_content), description: "Insights & Analysis exported as pretty JSON for readability (one array of objects)." },

  // ── Link ──
  { header: "Asymmetrix Profile", section: "Link", value: (c) => safe(c.company_link), description: "URL to the full Asymmetrix company profile." },
];

// ---------------------------------------------------------------------------
//  Vertical (card) layout builder
// ---------------------------------------------------------------------------

function buildVerticalCsv(companies) {
  const lines = [];

  for (let ci = 0; ci < companies.length; ci++) {
    const company = companies[ci];

    // Company header divider
    lines.push(
      csvRow([`━━━ COMPANY ${ci + 1} of ${companies.length} ━━━`, "", ""])
    );
    lines.push(csvRow(["Field", "Description", "Value"]));

    let lastSection = "";

    for (const col of COLUMNS) {
      // Section header
      if (col.section !== lastSection) {
        lastSection = col.section;
        lines.push(csvRow(["", "", ""])); // blank spacer
        lines.push(csvRow([`── ${col.section} ──`, "", ""]));
      }

      const val = String(col.value(company));
      lines.push(csvRow([col.header, col.description || "", val]));
    }

    // Spacer between companies
    lines.push(csvRow(["", "", ""]));
    lines.push(csvRow(["", "", ""]));
  }

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
//  Horizontal (classic) layout builder
// ---------------------------------------------------------------------------

function buildHorizontalCsv(companies) {
  const headerRow = csvRow(COLUMNS.map((col) => col.header));
  const dataRows = companies.map((company) =>
    csvRow(COLUMNS.map((col) => col.value(company)))
  );
  return [headerRow, ...dataRows].join("\n") + "\n";
}

// ---------------------------------------------------------------------------
//  Data dictionary
// ---------------------------------------------------------------------------

function generateDictionary(outputPath) {
  const dictPath = outputPath.replace(/\.csv$/i, "") + "-data-dictionary.csv";
  const BOM = "\uFEFF";
  const header = csvRow(["#", "Section", "Field Name", "Description"]);
  const rows = COLUMNS.map((col, i) =>
    csvRow([i + 1, col.section, col.header, col.description])
  );
  fs.writeFileSync(dictPath, BOM + [header, ...rows].join("\n") + "\n", "utf-8");
  console.log(`Data dictionary: ${dictPath}`);
  return dictPath;
}

// ---------------------------------------------------------------------------
//  API
// ---------------------------------------------------------------------------

async function fetchPage(page) {
  const url = new URL(API_URL);
  url.searchParams.set("Offset", String(page));
  url.searchParams.set("Per_page", String(PER_PAGE));
  COUNTRIES.forEach((c) => url.searchParams.append("Countries", c));

  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;

  const res = await fetch(url.toString(), { method: "GET", headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchAllCompanies() {
  process.stdout.write("Fetching page 1...");
  const data = await fetchPage(1);
  const items = data.items || [];
  const totalItems = data.pagination?.totalItems ?? items.length;
  console.log(` got ${items.length} items (${totalItems} total in DB).`);
  return items;
}

async function runLimited(tasks, limit, worker) {
  const results = new Array(tasks.length);
  let idx = 0;
  const runners = Array.from({ length: Math.max(1, limit) }, async () => {
    while (idx < tasks.length) {
      const myIdx = idx++;
      results[myIdx] = await worker(tasks[myIdx], myIdx);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchContentDetail(contentId) {
  if (!AUTH_TOKEN) return null;
  if (!contentId) return null;
  const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content/${encodeURIComponent(
    String(contentId)
  )}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const raw = Array.isArray(json) ? json[0] : json;
  if (!raw || typeof raw !== "object") return null;
  return {
    Publication_Date:
      raw?.Publication_Date ?? raw?.publication_date ?? raw?.PublicationDate ?? null,
    Body: raw?.Body ?? raw?.body ?? null,
  };
}

async function enrichRelatedContentBodies(companies) {
  if (!AUTH_TOKEN) return;
  const ids = new Set();
  for (const c of companies || []) {
    const items = c?.related_content;
    if (!Array.isArray(items)) continue;
    for (const a of items) {
      const id = a?.id;
      const hasBody = a?.Body != null || a?.body != null;
      if (id && !hasBody) ids.add(id);
    }
  }
  const uniqueIds = Array.from(ids);
  if (uniqueIds.length === 0) return;

  console.log(`\nEnriching article bodies: ${uniqueIds.length} items...`);
  const cache = new Map();

  await runLimited(uniqueIds, 3, async (id) => {
    const detail = await fetchContentDetail(id);
    if (detail) cache.set(id, detail);
  });

  for (const c of companies || []) {
    const items = c?.related_content;
    if (!Array.isArray(items)) continue;
    for (const a of items) {
      const id = a?.id;
      if (!id) continue;
      const detail = cache.get(id);
      if (!detail) continue;
      if (a.Body == null && a.body == null) a.Body = detail.Body;
      if (a.Publication_Date == null && a.PublicationDate == null && a.publication_date == null) {
        a.Publication_Date = detail.Publication_Date;
      }
    }
  }
}

// ---------------------------------------------------------------------------
//  Main
// ---------------------------------------------------------------------------

async function main() {
  const mode = HORIZONTAL ? "Horizontal" : "Vertical (card)";
  console.log("=".repeat(60));
  console.log("  Asymmetrix — Company Export to CSV");
  console.log("=".repeat(60));
  console.log();
  if (COUNTRIES.length > 0) console.log(`  Countries:  ${COUNTRIES.join(", ")}`);
  console.log(`  Per page:   ${PER_PAGE}`);
  console.log(`  Layout:     ${mode}`);
  console.log(`  Output:     ${OUTPUT_FILE}`);
  console.log();

  const companies = await fetchAllCompanies();
  console.log(`\nTotal fetched: ${companies.length}`);

  if (companies.length === 0) {
    console.log("Nothing to export.");
    process.exit(0);
  }

  // If token provided, enrich related content with full article body
  await enrichRelatedContentBodies(companies);

  const BOM = "\uFEFF";
  const csv = HORIZONTAL
    ? buildHorizontalCsv(companies)
    : buildVerticalCsv(companies);

  fs.writeFileSync(OUTPUT_FILE, BOM + csv, "utf-8");
  console.log(`\nCSV written to: ${OUTPUT_FILE}`);
  console.log(`  ${companies.length} companies, ${COLUMNS.length} fields, ${mode} layout`);

  if (GENERATE_DICTIONARY) {
    console.log();
    generateDictionary(OUTPUT_FILE);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
