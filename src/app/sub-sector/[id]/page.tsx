"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";
import {
  CorporateEvent,
  CorporateEventsResponse,
} from "@/types/corporateEvents";
import {
  ContentArticle,
  InsightsAnalysisResponse,
} from "@/types/insightsAnalysis";

const TABS = [
  { id: "all", name: "All Companies" },
  { id: "transactions", name: "Transactions" },
  { id: "insights", name: "Insights & Analysis" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface CompanyItem {
  id: number;
  name: string;
  description?: string;
  primary_sectors?: string[];
  secondary_sectors?: string[];
  ownership?: string;
  country?: string;
  linkedin_logo?: string; // base64
  linkedin_members?: number;
}

const SubSectorPage = () => {
  const params = useParams();
  const subSectorId = Number(params.id);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams?.get("tab") as TabId) || "all"
  );

  // Header title lookup
  const [subSectorName, setSubSectorName] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const all = await locationsService.getAllSecondarySectorsWithPrimary();
        if (cancelled) return;
        const found = (Array.isArray(all) ? all : []).find(
          (s) => s.id === subSectorId
        );
        setSubSectorName(found?.sector_name || "");
      } catch {
        // ignore name fetch failure
      }
    };
    if (!Number.isNaN(subSectorId)) run();
    return () => {
      cancelled = true;
    };
  }, [subSectorId]);

  // Sync tab in URL
  const setTab = (id: TabId) => {
    setActiveTab(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // -------------------------
  // All Companies (by sub-sector)
  // -------------------------
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [companiesPagination, setCompaniesPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 25,
    pageTotal: 0,
  });

  const fetchCompanies = useCallback(
    async (page: number = 1) => {
      setCompaniesLoading(true);
      setCompaniesError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setCompaniesError("Authentication required");
          return;
        }
        if (Number.isNaN(subSectorId) || subSectorId <= 0) {
          setCompaniesError("Invalid sub-sector id");
          return;
        }
        const perPage = 25;
        const params = new URLSearchParams();
        params.append("Offset", String(page));
        params.append("Per_page", String(perPage));
        params.append("Min_linkedin_members", "0");
        params.append("Max_linkedin_members", "0");
        params.append("Horizontals_ids", "");
        params.append("Secondary_sectors_ids[]", String(subSectorId));

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `API request failed: ${response.status} ${response.statusText} - ${text}`
          );
        }
        const data = (await response.json()) as {
          result1?: {
            items?: CompanyItem[];
            itemsReceived?: number;
            curPage?: number;
            nextPage?: number | null;
            prevPage?: number | null;
            offset?: number;
            perPage?: number;
            pageTotal?: number;
          };
        };
        const r1 = data.result1 || {};
        setCompanies(r1.items || []);
        setCompaniesPagination({
          itemsReceived: r1.itemsReceived || 0,
          curPage: r1.curPage || 1,
          nextPage: r1.nextPage || null,
          prevPage: r1.prevPage || null,
          offset: r1.offset || 0,
          perPage: r1.perPage || perPage,
          pageTotal: r1.pageTotal || 0,
        });
      } catch (e) {
        setCompaniesError(
          e instanceof Error ? e.message : "Failed to fetch companies"
        );
      } finally {
        setCompaniesLoading(false);
      }
    },
    [subSectorId]
  );

  useEffect(() => {
    if (activeTab === "all") fetchCompanies(1);
  }, [activeTab, fetchCompanies]);

  // -------------------------
  // Transactions (by sub-sector)
  // -------------------------
  const [events, setEvents] = useState<CorporateEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsPagination, setEventsPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
  });

  const fetchEvents = useCallback(
    async (page: number = 1) => {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setEventsError("Authentication required");
          return;
        }
        if (Number.isNaN(subSectorId) || subSectorId <= 0) {
          setEventsError("Invalid sub-sector id");
          return;
        }
        const params = new URLSearchParams();
        params.append("Page", String(page));
        params.append("Per_page", String(50));
        params.append("Secondary_sectors_ids[]", String(subSectorId));
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events?${params.toString()}`;
        const resp = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
        const data: CorporateEventsResponse = await resp.json();
        setEvents(data.items || []);
        setEventsPagination({
          itemsReceived: data.itemsReceived,
          curPage: data.curPage,
          nextPage: data.nextPage,
          prevPage: data.prevPage,
          offset: data.offset,
          perPage: 50,
          pageTotal: data.pageTotal,
        });
      } catch (e) {
        setEventsError(
          e instanceof Error ? e.message : "Failed to fetch corporate events"
        );
      } finally {
        setEventsLoading(false);
      }
    },
    [subSectorId]
  );

  useEffect(() => {
    if (activeTab === "transactions") fetchEvents(1);
  }, [activeTab, fetchEvents]);

  // -------------------------
  // Insights & Analysis (by sub-sector)
  // -------------------------
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsPagination, setInsightsPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 10,
    pageTotal: 0,
  });

  const fetchInsights = useCallback(
    async (page: number = 1) => {
      setInsightsLoading(true);
      setInsightsError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setInsightsError("Authentication required");
          return;
        }
        if (Number.isNaN(subSectorId) || subSectorId <= 0) {
          setInsightsError("Invalid sub-sector id");
          return;
        }
        const params = new URLSearchParams();
        params.append("Offset", String(page));
        params.append("Per_page", String(10));
        params.append("Secondary_sectors_ids", String(subSectorId));
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles?${params.toString()}`;
        const resp = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
        const data: InsightsAnalysisResponse = await resp.json();
        setArticles(data.items || []);
        setInsightsPagination({
          itemsReceived: data.itemsReceived,
          curPage: data.curPage,
          nextPage: data.nextPage,
          prevPage: data.prevPage,
          offset: data.offset,
          perPage: 10,
          pageTotal: data.pageTotal,
        });
      } catch (e) {
        setInsightsError(
          e instanceof Error ? e.message : "Failed to fetch insights"
        );
      } finally {
        setInsightsLoading(false);
      }
    },
    [subSectorId]
  );

  useEffect(() => {
    if (activeTab === "insights") fetchInsights(1);
  }, [activeTab, fetchInsights]);

  return (
    <div className="min-h-screen bg-gradient-to-br to-blue-50 from-slate-50">
      <Header />
      <header className="bg-white border-b shadow-sm border-slate-200/60">
        <div className="px-6 py-4 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {subSectorName || "Sub-Sector"}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 w-full">
        <div className="mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex overflow-x-auto space-x-8">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`relative py-4 px-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-blue-600"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.name}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === "all" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center text-xl">
                    <span className="inline-flex justify-center items-center w-8 h-8 bg-indigo-50 rounded-lg">
                      <svg
                        className="w-4 h-4 text-indigo-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 12h18M3 6h18M3 18h18" />
                      </svg>
                    </span>
                    <span className="text-slate-900">All Companies</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {companiesPagination.itemsReceived.toLocaleString()} total
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                {companiesLoading ? (
                  <div className="py-10 text-center text-slate-500">
                    Loading companies...
                  </div>
                ) : companiesError ? (
                  <div className="py-4 text-center text-red-600">
                    {companiesError}
                  </div>
                ) : companies.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    No companies found for this sub-sector.
                  </div>
                ) : (
                  <div className="overflow-x-hidden">
                    <table className="w-full text-sm table-fixed">
                      <thead className="bg-slate-50/80">
                        <tr className="hover:bg-slate-50/80">
                          <th className="py-3 font-semibold text-left text-slate-700 w-[8%]">
                            Logo
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[18%]">
                            Name
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[32%]">
                            Description
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[18%]">
                            Primary Sector(s)
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[16%]">
                            Sub-Sector(s)
                          </th>
                          <th className="py-3 px-3 font-semibold text-center text-slate-700 w-[8%]">
                            LinkedIn Members
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="py-3 pr-4">
                              {c.linkedin_logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`data:image/jpeg;base64,${c.linkedin_logo}`}
                                  alt={`${c.name} logo`}
                                  className="object-contain w-12 h-8 rounded"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex justify-center items-center w-12 h-8 text-[10px] text-slate-500 bg-slate-100 rounded">
                                  No Logo
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-4 align-top whitespace-normal break-words">
                              <a
                                href={`/company/${c.id}`}
                                className="font-medium text-blue-600 underline"
                              >
                                {c.name}
                              </a>
                            </td>
                            <td className="py-3 pr-4 align-top whitespace-normal break-words text-slate-700">
                              {c.description || "N/A"}
                            </td>
                            <td className="py-3 pr-4 align-top whitespace-normal break-words text-slate-700">
                              {Array.isArray(c.primary_sectors) &&
                              c.primary_sectors.length > 0
                                ? c.primary_sectors.join(", ")
                                : "N/A"}
                            </td>
                            <td className="py-3 pr-4 align-top whitespace-normal break-words text-slate-700">
                              {Array.isArray(c.secondary_sectors) &&
                              c.secondary_sectors.length > 0
                                ? c.secondary_sectors.join(", ")
                                : "N/A"}
                            </td>
                            <td className="py-3 pr-4 text-center text-slate-700">
                              {typeof c.linkedin_members === "number"
                                ? c.linkedin_members.toLocaleString()
                                : "0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {companiesPagination.pageTotal > 1 && (
              <div className="flex gap-2 justify-center items-center">
                <button
                  disabled={!companiesPagination.prevPage}
                  onClick={() =>
                    companiesPagination.prevPage &&
                    fetchCompanies(companiesPagination.prevPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {companiesPagination.curPage} of{" "}
                  {companiesPagination.pageTotal}
                </span>
                <button
                  disabled={!companiesPagination.nextPage}
                  onClick={() =>
                    companiesPagination.nextPage &&
                    fetchCompanies(companiesPagination.nextPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center text-xl">
                    <span className="inline-flex justify-center items-center w-8 h-8 bg-orange-50 rounded-lg">
                      <svg
                        className="w-4 h-4 text-orange-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 12h18M12 3v18" />
                      </svg>
                    </span>
                    <span className="text-slate-900">Transactions</span>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                {eventsLoading ? (
                  <div className="py-10 text-center text-slate-500">
                    Loading transactions...
                  </div>
                ) : eventsError ? (
                  <div className="py-4 text-center text-red-600">
                    {eventsError}
                  </div>
                ) : events.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    No corporate events found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col style={{ width: "40%" }} />
                        <col style={{ width: "30%" }} />
                        <col style={{ width: "30%" }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="p-3 text-sm font-semibold text-left text-slate-900">
                            Event
                          </th>
                          <th className="p-3 text-sm font-semibold text-left text-slate-900">
                            Parties
                          </th>
                          <th className="p-3 text-sm font-semibold text-left text-slate-900">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((event) => (
                          <tr
                            key={event.id}
                            className="border-b border-slate-100"
                          >
                            <td className="p-3 align-top break-words">
                              <div className="mb-1">
                                <a
                                  href={`/corporate-event/${event.id}`}
                                  className="font-medium text-blue-600 underline hover:text-blue-800"
                                >
                                  {event.description || "Not Available"}
                                </a>
                              </div>
                              <div className="text-xs text-slate-600">
                                Date:{" "}
                                {event.announcement_date
                                  ? new Date(
                                      event.announcement_date
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "Not available"}
                              </div>
                            </td>
                            <td className="p-3 text-xs align-top break-words text-slate-600">
                              <div className="mb-1">
                                <strong>Target:</strong>{" "}
                                {event.target_counterparty?.new_company ? (
                                  <a
                                    href={`/company/${
                                      event.target_counterparty
                                        ?.new_company_counterparty ||
                                      event.target_counterparty?.new_company
                                        ?.id ||
                                      ""
                                    }`}
                                    className="text-blue-600 underline hover:text-blue-800"
                                  >
                                    {event.target_counterparty?.new_company
                                      ?.name || "Not Available"}
                                  </a>
                                ) : (
                                  "Not Available"
                                )}
                              </div>
                              <div>
                                <strong>Buyer/Investor:</strong>{" "}
                                {Array.isArray(event.other_counterparties) &&
                                event.other_counterparties.length > 0
                                  ? event.other_counterparties
                                      .map(
                                        (cp) =>
                                          cp._new_company?.name || "Unknown"
                                      )
                                      .join(", ")
                                  : "Not Available"}
                              </div>
                            </td>
                            <td className="p-3 text-xs align-top break-words text-slate-600">
                              <div className="mb-1">
                                <strong>Deal Type:</strong>{" "}
                                {event.deal_type || "Not Available"}
                              </div>
                              <div>
                                <strong>Amount (m):</strong>{" "}
                                {event.investment_data?.investment_amount_m &&
                                event.investment_data?.currency?.Currency
                                  ? `${
                                      event.investment_data.currency.Currency
                                    }${Number(
                                      event.investment_data.investment_amount_m
                                    ).toLocaleString()}m`
                                  : "Not available"}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {eventsPagination.pageTotal > 1 && (
              <div className="flex gap-2 justify-center items-center">
                <button
                  disabled={!eventsPagination.prevPage}
                  onClick={() =>
                    eventsPagination.prevPage &&
                    fetchEvents(eventsPagination.prevPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {eventsPagination.curPage} of{" "}
                  {eventsPagination.pageTotal}
                </span>
                <button
                  disabled={!eventsPagination.nextPage}
                  onClick={() =>
                    eventsPagination.nextPage &&
                    fetchEvents(eventsPagination.nextPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center text-xl">
                    <span className="inline-flex justify-center items-center w-8 h-8 bg-indigo-50 rounded-lg">
                      <svg
                        className="w-4 h-4 text-indigo-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 12h18M3 6h18M3 18h18" />
                      </svg>
                    </span>
                    <span className="text-slate-900">Insights & Analysis</span>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                {insightsLoading ? (
                  <div className="py-10 text-center text-slate-500">
                    Loading articles...
                  </div>
                ) : insightsError ? (
                  <div className="py-4 text-center text-red-600">
                    {insightsError}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    No articles found.
                  </div>
                ) : (
                  <div
                    className="grid gap-4"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(320px, 1fr))",
                    }}
                  >
                    {articles.map((article) => (
                      <a
                        key={article.id}
                        href={`/article/${article.id}`}
                        className="block p-4 bg-white rounded-lg border shadow-sm transition-shadow border-slate-200 hover:shadow-md"
                      >
                        <h3 className="text-base font-semibold text-slate-900">
                          {article.Headline || "Not Available"}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {article.Publication_Date
                            ? new Date(
                                article.Publication_Date
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "Not available"}
                        </p>
                        {article.Content_Type && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded border bg-blue-50 text-blue-700 border-blue-200">
                            {article.Content_Type}
                          </span>
                        )}
                        <p className="mt-3 text-sm text-slate-700 line-clamp-4">
                          {article.Strapline || "No summary available"}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {insightsPagination.pageTotal > 1 && (
              <div className="flex gap-2 justify-center items-center">
                <button
                  disabled={!insightsPagination.prevPage}
                  onClick={() =>
                    insightsPagination.prevPage &&
                    fetchInsights(insightsPagination.prevPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {insightsPagination.curPage} of{" "}
                  {insightsPagination.pageTotal}
                </span>
                <button
                  disabled={!insightsPagination.nextPage}
                  onClick={() =>
                    insightsPagination.nextPage &&
                    fetchInsights(insightsPagination.nextPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SubSectorPage;
