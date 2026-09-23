"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FinMetricsCompanyItem } from "@/lib/contributorCrm/api";

// Minimal types for company profile display (can be extended when full API is wired)
export interface CompanyProfileData {
  company_id: number;
  company_name: string;
  description?: string | null;
  year_founded?: number | string | null;
  url?: string | null;
  ownership?: string | null;
  hq?: string | null;
  lifecycle_stage?: string | null;
  primary_sectors?: Array<{ sector_name: string; sector_id?: number }>;
  secondary_sectors?: Array<{ sector_name: string; sector_id?: number }>;
  parent_company?: { id: number; name: string } | null;
  investors?: Array<{ id: number; name: string }>;
  management_current?: Array<{ name: string; title: string }>;
  management_past?: Array<{ name: string; title: string }>;
  revenue_m?: string | number | null;
  ebitda_m?: string | number | null;
  ev_m?: string | number | null;
  revenue_multiple?: number | string | null;
  revenue_growth_pc?: number | string | null;
  ebitda_margin?: number | string | null;
  rule_of_40?: number | string | null;
  arr_pc?: number | string | null;
  arr_m?: string | number | null;
  churn_pc?: number | string | null;
  grr_pc?: number | string | null;
  nrr?: number | string | null;
  employees_count?: number | null;
  product_type?: Array<{ label: string; value: string }>;
  data_collection_method?: Array<{ label: string; value: string }>;
  revenue_model?: Array<{ label: string; value: string }>;
  corporate_events?: Array<{ id?: number; description?: string; announcement_date?: string; deal_type?: string }>;
  subsidiaries?: Array<{ id: number; name: string; description?: string; sectors?: string; country?: string }>;
  logo_base64?: string | null;
  linkedin_url?: string | null;
}

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

const formatPlainNumber = (value?: number | string | null): string => {
  if (value === undefined || value === null) return "Not available";
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 10 });
  const trimmed = String(value).trim();
  if (!trimmed) return "Not available";
  const num = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(num) ? num.toLocaleString("en-US") : trimmed;
};

const formatPercent = (value?: number | string | null): string => {
  if (value === undefined || value === null) return "Not available";
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? `${Math.round(n)}%` : "Not available";
};

const formatMultiple = (value?: number | string | null): string => {
  if (value === undefined || value === null) return "Not available";
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? `${(Math.round(n * 10) / 10).toLocaleString()}x` : "Not available";
};

// Company logo placeholder / with image
const CompanyLogo = ({ logo, name }: { logo?: string | null; name: string }) => {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={80}
        height={60}
        className="rounded-lg object-contain"
      />
    );
  }
  return (
    <div className="flex h-[60px] w-20 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
      No Logo
    </div>
  );
};

const styles = {
  card: "rounded-xl bg-white p-5 sm:p-6 shadow-sm border border-gray-200/80",
  sectionTitle: "text-lg font-semibold text-gray-900 mb-4 mt-0",
  infoRow: "grid grid-cols-[minmax(140px,180px)_1fr_auto] gap-2 items-center py-2.5 border-b border-gray-100 last:border-0",
  label: "text-sm font-medium text-gray-500",
  value: "text-sm text-gray-900 break-words",
  sourceValue: "text-xs text-gray-400 text-right whitespace-nowrap pl-2",
  link: "text-blue-600 underline hover:text-blue-700",
  tag: "inline-block rounded px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800",
  tagGreen: "inline-block rounded px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800",
};

interface CompanyProfileTabProps {
  companyId: string;
  row?: FinMetricsCompanyItem | null;
  profile?: CompanyProfileData | null;
  loading?: boolean;
}

export function CompanyProfileTab({ companyId, row, profile, loading }: CompanyProfileTabProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [showAllSubsidiaries, setShowAllSubsidiaries] = useState(false);

  const companyName =
    profile?.company_name ??
    (row ? (typeof row.company_name === "number" ? String(row.company_name) : row.company_name) : null) ??
    `Company #${companyId}`;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-gray-50/80 p-8">
        <span className="text-sm text-gray-500">Loading company profile…</span>
      </div>
    );
  }

  const primarySectors = profile?.primary_sectors ?? [];
  const secondarySectors = profile?.secondary_sectors ?? [];
  const productTypeRows = profile?.product_type ?? [];
  const dataCollectionRows = profile?.data_collection_method ?? [];
  const revenueModelRows = profile?.revenue_model ?? [];
  const attributeSections = [
    { title: "Product Type", valueHeader: "% of revenue", rows: productTypeRows },
    { title: "Data Collection Method", valueHeader: "Predominance", rows: dataCollectionRows },
    { title: "Revenue Model", valueHeader: "Predominance", rows: revenueModelRows },
  ].filter((s) => s.rows.length > 0);

  const subsidiaries = profile?.subsidiaries ?? [];
  const corporateEvents = profile?.corporate_events ?? [];
  const hasSubsidiaries = subsidiaries.length > 0;
  const hasManagement =
    (profile?.management_current?.length ?? 0) > 0 || (profile?.management_past?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header card: logo, name, actions */}
      <div className={styles.card}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-center gap-4 min-w-0">
            <CompanyLogo logo={profile?.logo_base64} name={companyName} />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{companyName}</h1>
              {profile?.year_founded != null && (
                <p className="text-sm text-gray-500 mt-0.5">Founded {String(profile.year_founded)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Export PDF
            </button>
            <a
              href="mailto:asymmetrix@asymmetrixintelligence.com?subject=Report%20Incorrect%20Company%20Data"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 no-underline"
            >
              Contribute Data
            </a>
          </div>
        </div>

        {/* Two-column grid: Overview (left) | Financial Metrics (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Overview card content */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-6">
              {/* Left: basic fields */}
              <div className="space-y-0">
                <div className={styles.infoRow}>
                  <span className={styles.label}>Primary Sector(s):</span>
                  <div className={styles.value}>
                    {primarySectors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {primarySectors.map((s, i) => (
                          <span key={i} className={styles.tag}>
                            {s.sector_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "Not available"
                    )}
                  </div>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Secondary Sector(s):</span>
                  <div className={styles.value}>
                    {secondarySectors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {secondarySectors.map((s, i) => (
                          <span key={i} className={styles.tag}>
                            {s.sector_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "Not available"
                    )}
                  </div>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Year Founded:</span>
                  <span className={styles.value}>
                    {profile?.year_founded != null ? String(profile.year_founded) : "Not available"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Website:</span>
                  <span className={styles.value}>
                    {profile?.url ? (
                      <a href={profile.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        {profile.url}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Ownership:</span>
                  <span className={styles.value}>{profile?.ownership ?? "Not available"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>HQ:</span>
                  <span className={styles.value}>{profile?.hq ?? "Not available"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Lifecycle stage:</span>
                  <span className={styles.value}>{profile?.lifecycle_stage ?? "Not available"}</span>
                </div>
                {profile?.parent_company && (
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Parent Company:</span>
                    <div className={styles.value}>
                      <Link href={`/contributor-crm/${profile.parent_company.id}`} className={styles.tagGreen}>
                        {profile.parent_company.name}
                      </Link>
                    </div>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <span className={styles.label}>Investors:</span>
                  <div className={styles.value}>
                    {profile?.investors && profile.investors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.investors.map((inv) => (
                          <span key={inv.id} className={styles.tagGreen}>
                            {inv.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "Not available"
                    )}
                  </div>
                </div>
                {hasManagement && (
                  <div className="pt-4">
                    <h3 className={styles.sectionTitle}>Management</h3>
                    {profile?.management_current && profile.management_current.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">Current:</div>
                        <ul className="text-sm text-gray-900 list-disc pl-4 space-y-0.5">
                          {profile.management_current.map((m, i) => (
                            <li key={i}>
                              {m.name} — {m.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {profile?.management_past && profile.management_past.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Past:</div>
                        <ul className="text-sm text-gray-900 list-disc pl-4 space-y-0.5">
                          {profile.management_past.map((m, i) => (
                            <li key={i}>
                              {m.name} — {m.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: description, attributes, insights */}
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <div
                    className={`text-sm text-gray-900 leading-relaxed ${!descriptionExpanded ? "line-clamp-3" : ""}`}
                  >
                    {profile?.description || "No description available"}
                  </div>
                  {(profile?.description?.length ?? 0) > 200 && (
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded((e) => !e)}
                      className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {descriptionExpanded ? "Show less" : "Expand"}
                    </button>
                  )}
                </div>
                {attributeSections.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                    {attributeSections.map((section) => (
                      <div key={section.title}>
                        <div className="text-xs font-semibold text-gray-700 mb-1">{section.title}</div>
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            {section.rows.map((r, i) => (
                              <tr key={i}>
                                <td className="py-1 border-b border-gray-100 text-gray-900">{r.label}</td>
                                <td className="py-1 border-b border-gray-100 text-right text-gray-600">{r.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </span>
                    <span className="font-semibold text-slate-900">Recent Insights &amp; Analysis</span>
                  </div>
                  <div className="p-4 text-center text-sm text-slate-500">
                    No insights available for this company yet
                  </div>
                </div>
              </div>
            </div>

            {/* Corporate Events */}
            {(corporateEvents.length > 0 || row) && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className={styles.sectionTitle}>Corporate Events</h3>
                {corporateEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Type</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {corporateEvents.map((ev, i) => (
                          <tr key={ev.id ?? i} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-gray-600">{ev.announcement_date ?? "—"}</td>
                            <td className="py-2 px-3 text-gray-900">{ev.deal_type ?? "—"}</td>
                            <td className="py-2 px-3 text-gray-900">{ev.description ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No corporate events</p>
                )}
              </div>
            )}

            {/* Subsidiaries */}
            {hasSubsidiaries && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={styles.sectionTitle}>Current Subsidiaries</h3>
                  {subsidiaries.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSubsidiaries((v) => !v)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {showAllSubsidiaries ? "Show less" : "See more"}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Name</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Sectors</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllSubsidiaries ? subsidiaries : subsidiaries.slice(0, 3)).map((sub) => (
                        <tr key={sub.id} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-900">
                            <Link href={`/contributor-crm/${sub.id}`} className={styles.link}>
                              {sub.name}
                            </Link>
                          </td>
                          <td className="py-2 px-3 text-gray-600 max-w-[240px] truncate">{sub.description ?? "—"}</td>
                          <td className="py-2 px-3 text-gray-600">{sub.sectors ?? "—"}</td>
                          <td className="py-2 px-3 text-gray-600">{sub.country ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Financial Metrics card */}
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Financial Metrics</h2>
            <div className="space-y-0">
              <div className={styles.infoRow}>
                <span className={styles.label}>Revenue (m):</span>
                <span className={styles.value}>{formatPlainNumber(profile?.revenue_m)}</span>
                <span className={styles.sourceValue}>Source</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>EBITDA (m):</span>
                <span className={styles.value}>{formatPlainNumber(profile?.ebitda_m)}</span>
                <span className={styles.sourceValue}>Source</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Enterprise Value (m):</span>
                <span className={styles.value}>{formatPlainNumber(profile?.ev_m)}</span>
                <span className={styles.sourceValue}>Source</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Revenue multiple:</span>
                <span className={styles.value}>{formatMultiple(profile?.revenue_multiple)}</span>
                <span className={styles.sourceValue}>Source</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Revenue Growth:</span>
                <span className={styles.value}>{formatPercent(profile?.revenue_growth_pc)}</span>
                <span className={styles.sourceValue}>Source</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>EBITDA margin:</span>
                <span className={styles.value}>{formatPercent(profile?.ebitda_margin)}</span>
                <span className={styles.sourceValue}>Source</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Rule of 40:</span>
                <span className={styles.value}>
                  {profile?.rule_of_40 != null ? String(profile.rule_of_40) : "Not available"}
                </span>
                <span className={styles.sourceValue}>Source</span>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-200">
              <div className="text-sm font-semibold text-gray-900 mb-2">Subscription Metrics</div>
              <div className="space-y-0">
                <div className={styles.infoRow}>
                  <span className={styles.label}>Recurring Revenue:</span>
                  <span className={styles.value}>{formatPercent(profile?.arr_pc)}</span>
                  <span className={styles.sourceValue}>Source</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>ARR (m):</span>
                  <span className={styles.value}>{formatPlainNumber(profile?.arr_m)}</span>
                  <span className={styles.sourceValue}>Source</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Churn:</span>
                  <span className={styles.value}>{formatPercent(profile?.churn_pc)}</span>
                  <span className={styles.sourceValue}>Source</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>GRR:</span>
                  <span className={styles.value}>{formatPercent(profile?.grr_pc)}</span>
                  <span className={styles.sourceValue}>Source</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>NRR:</span>
                  <span className={styles.value}>{formatPercent(profile?.nrr)}</span>
                  <span className={styles.sourceValue}>Source</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-200">
              <div className="text-sm font-semibold text-gray-900 mb-2">Other Metrics</div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Number of employees:</span>
                <span className={styles.value}>
                  {profile?.employees_count != null ? formatNumber(profile.employees_count) : "Not available"}
                </span>
                <span className={styles.sourceValue}>Source</span>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-200">
              <div className="text-sm font-semibold text-gray-900 mb-2">LinkedIn Employee Count</div>
              <div className="text-xl font-bold text-blue-600 mb-2">
                {profile?.employees_count != null ? formatNumber(profile.employees_count) : "0"} employees
              </div>
              <div className="h-[200px] flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
                Chart area (wire to employee history when API available)
              </div>
            </div>
            {profile?.linkedin_url && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#0077b5] text-white hover:bg-[#005582]"
                  aria-label="LinkedIn"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
