#!/usr/bin/env node

/**
 * ============================================================
 *  Asymmetrix — Export Companies to CSV
 * ============================================================
 *
 *  Fetches all companies from the Xano dynamic SQL endpoint
 *  and writes a clean, human-readable CSV file.
 *
 *  Usage:
 *    node scripts/export-companies-csv.mjs [options]
 *
 *  Options:
 *    --countries "United Kingdom,United States"   Filter by countries (comma-separated)
 *    --sectors   "Insurance,Fintech"              Filter by primary sector names
 *    --ownership "Private,Subsidiary"             Filter by ownership types
 *    --per-page  100                              Items per API page (default 100)
 *    --output    my-export.csv                    Output filename (default: companies-export-<timestamp>.csv)
 *    --token     YOUR_AUTH_TOKEN                  Bearer token (reads ASYMMETRIX_TOKEN env var as fallback)
 *
 *  Examples:
 *    node scripts/export-companies-csv.mjs
 *    node scripts/export-companies-csv.mjs --countries "United Kingdom"
 *    node scripts/export-companies-csv.mjs --countries "United Kingdom,Germany" --per-page 50
 *    ASYMMETRIX_TOKEN=xyz node scripts/export-companies-csv.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
//  Configuration
// ---------------------------------------------------------------------------

const API_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies_dynamic_sql";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
//  CLI argument parsing (lightweight, no deps)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith("--") && i + 1 < argv.length) {
      args[key.slice(2)] = argv[++i];
    }
  }
  return args;
}

const cliArgs = parseArgs(process.argv);

const COUNTRIES = cliArgs.countries
  ? cliArgs.countries.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const SECTORS = cliArgs.sectors
  ? cliArgs.sectors.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const OWNERSHIP = cliArgs.ownership
  ? cliArgs.ownership.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const PER_PAGE = parseInt(cliArgs["per-page"] || "100", 10);
const AUTH_TOKEN = cliArgs.token || process.env.ASYMMETRIX_TOKEN || "";

const timestamp = new Date().toISOString().slice(0, 10);
const OUTPUT_FILE = path.resolve(
  PROJECT_ROOT,
  cliArgs.output || `companies-export-${timestamp}.csv`
);

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/** Escape a value for CSV (RFC 4180). */
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Join an array of values into a CSV row. */
function csvRow(values) {
  return values.map(csvEscape).join(",");
}

/** Safe accessor — returns empty string for null/undefined. */
function safe(val) {
  return val === null || val === undefined ? "" : val;
}

/** Format a semicolon-separated list from an array of objects using a key. */
function listNames(arr, key = "name") {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr
    .map((item) => (typeof item === "string" ? item : item?.[key] ?? ""))
    .filter(Boolean)
    .join("; ");
}

/** Format sectors array [{sector_name}] to "Sector1; Sector2". */
function formatSectors(sectors) {
  if (!Array.isArray(sectors)) return "";
  return sectors
    .map((s) => (typeof s === "string" ? s : s?.sector_name ?? ""))
    .filter(Boolean)
    .join("; ");
}

/** Format corporate events — one event per line inside the cell. */
function formatEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return "";
  return events
    .map((e, i) => {
      const type = e.deal_type || "Unknown";
      const date = e.announcement_date || "N/A";
      const status = e.deal_status ? ` — ${e.deal_status}` : "";
      const desc = (e.description || "").replace(/\n/g, " ").trim();
      return `${i + 1}. ${type}${status} (${date})\n   ${desc}`;
    })
    .join("\n\n");
}

/** Format management roles — one person per line. */
function formatManagement(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return "";
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
    .filter(Boolean)
    .join("\n");
}

/** Format subsidiaries — one per line. */
function formatSubsidiaries(subs) {
  if (!Array.isArray(subs) || subs.length === 0) return "";
  return subs
    .map((s) => {
      const name = s.name || "";
      const date = s.acquired_date ? ` (acquired ${s.acquired_date})` : "";
      return `${name}${date}`;
    })
    .filter(Boolean)
    .join("\n");
}

/** Format parent companies. */
function formatParents(parentObj) {
  const parents = parentObj?.Parant_companies;
  if (!Array.isArray(parents) || parents.length === 0) return "";
  return parents.map((p) => p?.name ?? "").filter(Boolean).join("\n");
}

/** Format investors list — one per line. */
function formatInvestors(investors) {
  if (!Array.isArray(investors) || investors.length === 0) return "";
  return investors.map((i) => i?.name ?? "").filter(Boolean).join("\n");
}

/** Format related content — one article per line. */
function formatContent(articles) {
  if (!Array.isArray(articles) || articles.length === 0) return "";
  return articles
    .map((a, i) => {
      const type = a.content_type || "";
      const headline = (a.headline || "").replace(/\n/g, " ").trim();
      const date = a.publication_date || "N/A";
      const strapline = (a.strapline || "").replace(/\n/g, " ").trim();
      const typeTag = type ? `[${type}] ` : "";
      const summary = strapline ? `\n   ${strapline}` : "";
      return `${i + 1}. ${typeTag}${headline} (${date})${summary}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
//  CSV column definitions
// ---------------------------------------------------------------------------

const COLUMNS = [
  // ── Company basics ──
  { header: "Company ID", value: (c) => safe(c.id) },
  { header: "Company Name", value: (c) => safe(c.name) },
  { header: "Description", value: (c) => safe(c.description) },
  { header: "Ownership", value: (c) => safe(c.ownership) },
  { header: "Website", value: (c) => safe(c.url) },
  { header: "Year Founded", value: (c) => safe(c.year_founded) },
  {
    header: "Former Names",
    value: (c) =>
      Array.isArray(c.Former_name)
        ? c.Former_name.filter(Boolean).join("; ")
        : "",
  },
  { header: "Country", value: (c) => safe(c.country) },
  { header: "Province / State", value: (c) => safe(c.province) },
  { header: "City", value: (c) => safe(c.city) },
  {
    header: "Lifecycle Stage",
    value: (c) => safe(c.Lifecycle_stage?.Lifecycle_Stage),
  },

  // ── Sectors ──
  { header: "Primary Sectors", value: (c) => formatSectors(c.primary_sectors) },
  {
    header: "Secondary Sectors",
    value: (c) => formatSectors(c.secondary_sectors),
  },

  // ── Financial metrics ──
  { header: "Revenue (m)", value: (c) => safe(c.revenue_m) },
  { header: "Revenue Display", value: (c) => safe(c.revenue_display) },
  { header: "Revenue Currency", value: (c) => safe(c.rev_currency) },
  { header: "EBITDA (m)", value: (c) => safe(c.ebitda_m) },
  { header: "EBITDA Display", value: (c) => safe(c.ebitda_display) },
  { header: "EBITDA Currency", value: (c) => safe(c.ebitda_currency) },
  { header: "Enterprise Value (m)", value: (c) => safe(c.ev) },
  {
    header: "Enterprise Value Display",
    value: (c) => safe(c.enterprise_value_display),
  },
  { header: "EV Currency", value: (c) => safe(c.ev_currency) },
  { header: "Revenue Multiple", value: (c) => safe(c.revenue_multiple) },
  { header: "Revenue Growth %", value: (c) => safe(c.rev_growth_pc) },
  { header: "EBITDA Margin %", value: (c) => safe(c.ebitda_margin) },
  { header: "Rule of 40", value: (c) => safe(c.rule_of_40) },
  { header: "ARR (m)", value: (c) => safe(c.arr_m) },
  { header: "Recurring Revenue %", value: (c) => safe(c.arr_pc) },
  { header: "ARR Currency", value: (c) => safe(c.arr_currency) },
  { header: "Churn %", value: (c) => safe(c.churn_pc) },
  { header: "GRR %", value: (c) => safe(c.grr_pc) },
  { header: "NRR", value: (c) => safe(c.nrr) },
  { header: "New Client Revenue Growth %", value: (c) => safe(c.new_client_growth_pc) },
  { header: "Financial Year", value: (c) => safe(c.financial_year) },

  // ── Corporate events ──
  {
    header: "Corporate Events",
    value: (c) => formatEvents(c.new_counterparties),
  },

  // ── Investors ──
  {
    header: "Current Investors",
    value: (c) => formatInvestors(c.investors_current),
  },
  {
    header: "Past Investors",
    value: (c) => formatInvestors(c.investors_past),
  },

  // ── Management ──
  {
    header: "Current Management",
    value: (c) => formatManagement(c.Managmant_Roles_current),
  },
  {
    header: "Past Management",
    value: (c) => formatManagement(c.Managmant_Roles_past),
  },

  // ── Subsidiaries ──
  {
    header: "Subsidiaries",
    value: (c) =>
      formatSubsidiaries(
        c.have_subsidiaries_companies?.Subsidiaries_companies
      ),
  },

  // ── Parent company ──
  {
    header: "Parent Company",
    value: (c) => formatParents(c.have_parent_company),
  },

  // ── Related content ──
  {
    header: "Related Content",
    value: (c) => formatContent(c.related_content),
  },

  // ── Link ──
  { header: "Asymmetrix Profile Link", value: (c) => safe(c.company_link) },
];

// ---------------------------------------------------------------------------
//  API fetching with pagination
// ---------------------------------------------------------------------------

async function fetchPage(page) {
  const url = new URL(API_URL);

  // Core pagination params
  url.searchParams.set("Offset", String(page));
  url.searchParams.set("Per_page", String(PER_PAGE));

  // Optional filters
  COUNTRIES.forEach((c) => url.searchParams.append("Countries", c));
  SECTORS.forEach((s) => url.searchParams.append("primary_sectors_ids", s));
  OWNERSHIP.forEach((o) => url.searchParams.append("ownership_types", o));

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }

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
  console.log(` got ${items.length} items (${totalItems} total in database).`);
  return items;
}

// ---------------------------------------------------------------------------
//  Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("  Asymmetrix — Company Export to CSV");
  console.log("=".repeat(60));
  console.log();

  if (COUNTRIES.length > 0) console.log(`  Countries filter: ${COUNTRIES.join(", ")}`);
  if (SECTORS.length > 0) console.log(`  Sectors filter:   ${SECTORS.join(", ")}`);
  if (OWNERSHIP.length > 0) console.log(`  Ownership filter: ${OWNERSHIP.join(", ")}`);
  console.log(`  Per page:         ${PER_PAGE}`);
  console.log(`  Output:           ${OUTPUT_FILE}`);
  console.log(`  Auth:             ${AUTH_TOKEN ? "Yes (token provided)" : "No token"}`);
  console.log();

  // Fetch
  const companies = await fetchAllCompanies();
  console.log();
  console.log(`Total companies fetched: ${companies.length}`);

  if (companies.length === 0) {
    console.log("No companies to export. Exiting.");
    process.exit(0);
  }

  // Build CSV
  const headerRow = csvRow(COLUMNS.map((col) => col.header));
  const dataRows = companies.map((company) =>
    csvRow(COLUMNS.map((col) => col.value(company)))
  );

  // UTF-8 BOM for proper Excel display
  const BOM = "\uFEFF";
  const csvContent = BOM + [headerRow, ...dataRows].join("\n") + "\n";

  // Write file
  fs.writeFileSync(OUTPUT_FILE, csvContent, "utf-8");
  console.log();
  console.log(`CSV written to: ${OUTPUT_FILE}`);
  console.log(`Rows: ${dataRows.length} companies, ${COLUMNS.length} columns`);
  console.log();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
