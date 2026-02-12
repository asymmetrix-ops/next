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
 *    --company-id 1902                           Filter to a single company id
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
const COMPANY_ID = cliArgs["company-id"] ? String(cliArgs["company-id"]).trim() : "";
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

function formatManagementJson(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return "[]";
  const arr = roles
    .map((r) => {
      const name = r?.Individual_text || r?.individual_name || "";
      const roleNames = Array.isArray(r?.job_titles_id)
        ? r.job_titles_id
            .map((t) => (typeof t === "string" ? t : t?.job_title ?? ""))
            .filter(Boolean)
        : Array.isArray(r?.job_titles)
        ? r.job_titles.filter(Boolean)
        : [];
      if (!name && roleNames.length === 0) return null;
      return { name, roles: roleNames };
    })
    .filter(Boolean);
  return prettyJson(arr);
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
        "Publication Date":
          a?.Publication_Date ?? a?.publication_date ?? a?.PublicationDate ?? null,
        // Keep shape stable; body is intentionally omitted in this export style
        Body: null,
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
  // IMPORTANT: Keep the order, labels, and descriptions aligned to the expected CSV template.
  { header: "Company ID", section: "Company", value: (c) => safe(c.id), description: "Unique numeric identifier for the company in the Asymmetrix database." },
  { header: "Company Name", section: "Company", value: (c) => safe(c.name), description: "Official registered name of the company." },
  { header: "Description", section: "Company", value: (c) => safe(c.description), description: "Free-text summary of what the company does, its history, products, and market position." },
  { header: "Ownership", section: "Company", value: (c) => safe(c.ownership), description: "Ownership: e.g. Private, Public, Private Equity, Venture Capital, Subsidiary, Acquired or Closed." },
  { header: "Website", section: "Company", value: (c) => safe(c.url), description: "The company's own website URL." },
  { header: "Year Founded", section: "Company", value: (c) => safe(c.year_founded), description: "The year the company was originally founded." },
  { header: "Former Names", section: "Company", value: (c) => Array.isArray(c.Former_name) ? c.Former_name.filter(Boolean).join("; ") : "", description: "Any previous names the company traded under." },
  { header: "Country", section: "Company", value: (c) => safe(c.country), description: "Country where the HQ is located." },
  { header: "Province / State", section: "Company", value: (c) => safe(c.province), description: "State, province, or region of HQ." },
  { header: "City", section: "Company", value: (c) => safe(c.city), description: "City of HQ." },
  { header: "Lifecycle Stage", section: "Company", value: (c) => safe(c.Lifecycle_stage?.Lifecycle_Stage), description: "e.g. Pre-seed, Seed, Series A, Series B etc, Growth, Buyout" },
  { header: "Primary Sectors", section: "Company", value: (c) => formatSectors(c.primary_sectors), description: "Primary Data & Analytics industry sectors the company operates in." },
  { header: "Secondary Sectors", section: "Company", value: (c) => formatSectors(c.secondary_sectors), description: "Secondary Data & Analytics sub-sectors" },
  { header: "Parent Company", section: "Company", value: (c) => formatParents(c.have_parent_company), description: "Name of the parent company, if a subsidiary or acquired" },

  { header: "Revenue (m)", section: "Financial", value: (c) => safe(c.revenue_m), description: "Annual revenue in millions." },
  { header: "Revenue Currency", section: "Financial", value: (c) => safe(c.rev_currency), description: "Currency code for revenue (USD, GBP, EUR, etc.)." },
  { header: "Revenue Growth %", section: "Financial", value: (c) => safe(c.rev_growth_pc), description: "Year-over-year revenue growth rate." },
  { header: "Revenue Multiple", section: "Financial", value: (c) => safe(c.revenue_multiple), description: "EV / Revenue. How the market values each unit of revenue." },
  { header: "EBITDA (m)", section: "Financial", value: (c) => safe(c.ebitda_m), description: "Earnings Before Interest, Taxes, Depreciation & Amortisation (millions)." },
  { header: "EBITDA Currency", section: "Financial", value: (c) => safe(c.ebitda_currency), description: "Currency code for EBITDA (USD, GBP, EUR, etc.)." },
  { header: "EBITDA Margin %", section: "Financial", value: (c) => safe(c.ebitda_margin), description: "EBITDA as a % of revenue. Measures operating profitability." },
  { header: "Enterprise Value (m)", section: "Financial", value: (c) => safe(c.ev), description: "Enterprise value in millions." },
  { header: "Enterprise Value Currency", section: "Financial", value: (c) => safe(c.ev_currency), description: "Currency code for Enterprise Value (USD, GBP, EUR, etc.)." },
  { header: "Rule of 40", section: "Financial", value: (c) => safe(c.rule_of_40), description: "Revenue growth % + EBITDA margin %. SaaS benchmark; >40 is strong." },
  { header: "ARR (m)", section: "Financial", value: (c) => safe(c.arr_m), description: "Annual Recurring Revenue in millions." },
  { header: "ARR Currency", section: "Financial", value: (c) => safe(c.arr_currency), description: "Currency code for ARR (USD, GBP, EUR, etc.)." },
  { header: "Recurring Revenue %", section: "Financial", value: (c) => safe(c.arr_pc), description: "% of total revenue that is recurring." },
  { header: "Churn %", section: "Financial", value: (c) => safe(c.churn_pc), description: "Annual customer/revenue churn rate. Lower is better." },
  { header: "Upsell %", section: "Financial", value: (c) => safe(c.upsell_pc), description: "Upsell to clients" },
  { header: "Cross-sell %", section: "Financial", value: (c) => safe(c.cross_sell_pc), description: "Cross sell to clients" },
  { header: "Price increase %", section: "Financial", value: (c) => safe(c.price_increase_pc), description: "Price increases to clients" },
  { header: "Revenue from new clients %", section: "Financial", value: (c) => safe(c.rev_expansion_pc), description: "New client revenue" },
  { header: "GRR %", section: "Financial", value: (c) => safe(c.grr_pc), description: "Gross Revenue Retention. 100% = zero churn." },
  { header: "NRR %", section: "Financial", value: (c) => safe(c.nrr), description: "Net Revenue Retention incl. expansions. >100% = existing customers growing." },
  { header: "New Client Revenue Growth %", section: "Financial", value: (c) => safe(c.new_client_growth_pc), description: "Revenue growth from newly acquired clients." },
  { header: "Financial Year", section: "Financial", value: (c) => safe(c.financial_year), description: "Financial year the metrics relate to." },

  { header: "Current Management", section: "People", value: (c) => formatManagementJson(c.Managmant_Roles_current), description: "Current leadership: Name — Title(s)." },
  { header: "Past Management", section: "People", value: (c) => formatManagement(c.Managmant_Roles_past), description: "Former leadership: Name — Title(s)." },
  { header: "Current Investors", section: "People", value: (c) => formatInvestors(c.investors_current), description: "Investors currently holding a stake." },
  { header: "Past Investors", section: "People", value: (c) => formatInvestors(c.investors_past), description: "Investors that have exited." },
  { header: "Subsidiaries", section: "People", value: (c) => formatSubsidiaries(c.have_subsidiaries_companies?.Subsidiaries_companies), description: "Owned companies, with acquisition date." },

  { header: "Corporate Events (JSON)", section: "Events", value: (c) => formatEventsJson(c.new_counterparties), description: "Corporate events exported as pretty JSON for readability (one array of objects)." },
  { header: "Insights & Analysis (JSON)", section: "Content", value: (c) => formatContentJson(c.related_content), description: "Insights & Analysis exported as pretty JSON for readability (one array of objects)." },
  { header: "Asymmetrix Profile", section: "Link", value: (c) => safe(c.company_link), description: "URL to the full Asymmetrix company profile." },
];

// ---------------------------------------------------------------------------
//  Vertical (card) layout builder
// ---------------------------------------------------------------------------

function buildVerticalCsv(companies) {
  const lines = [];
  lines.push(csvRow(["Field", "Description", "Value"]));

  for (let ci = 0; ci < companies.length; ci++) {
    const company = companies[ci];
    for (const col of COLUMNS) {
      const val = String(col.value(company));
      lines.push(csvRow([col.header, col.description || "", val]));
    }
    // Spacer between companies (if more than one)
    if (ci < companies.length - 1) lines.push(csvRow(["", "", ""]));
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
  if (COMPANY_ID) url.searchParams.set("company_id", COMPANY_ID);

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
  // Some API deployments ignore Per_page; enforce locally to guarantee output size.
  const limitedItems = items.slice(0, PER_PAGE);
  const totalItems = data.pagination?.totalItems ?? items.length;
  console.log(` got ${limitedItems.length} items (${totalItems} total in DB).`);
  return limitedItems;
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
