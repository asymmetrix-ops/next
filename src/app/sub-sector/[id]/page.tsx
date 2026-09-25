"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import { locationsService } from "@/lib/locationsService";
import CompactPagination from "@/components/ui/CompactPagination";
import ProfileSubnav from "@/components/ProfileSubnav";
import { T } from "@/components/redesign/primitives";
import { ContentArticle, InsightsAnalysisResponse } from "@/types/insightsAnalysis";
import { ScopedCompaniesPanel } from "@/components/companies/ScopedCompaniesPanel";
import { ScopedCorporateEventsPanel } from "@/components/corporate-events/ScopedCorporateEventsPanel";
import InsightsAnalysisCard from "@/components/InsightsAnalysisCard";

const TABS = [
  { id: "all", name: "All Companies" },
  { id: "transactions", name: "Transactions" },
  { id: "insights", name: "Insights & Analysis" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const INSIGHTS_GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 16,
  width: "100%",
  boxSizing: "border-box",
  alignItems: "stretch",
};

const SubSectorPage = () => {
  const params = useParams();
  const subSectorId = Number(params.id);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams?.get("tab") as TabId) || "all"
  );

  // Header lookup: sub-sector name + parent primary sector (for breadcrumb)
  const [subSectorName, setSubSectorName] = useState<string>("");
  const [primarySector, setPrimarySector] = useState<{
    id: number;
    sector_name: string;
  } | null>(null);
  const [headerLoaded, setHeaderLoaded] = useState(false);

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
        const related = found?.related_primary_sector;
        setPrimarySector(
          related?.id != null
            ? { id: related.id, sector_name: related.sector_name }
            : null
        );
      } catch {
        // ignore name fetch failure
      } finally {
        if (!cancelled) setHeaderLoaded(true);
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
  // Insights & Analysis (by sub-sector)
  // -------------------------
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsPagination, setInsightsPagination] = useState({
    itemsReceived: 0,
    itemsTotal: 0,
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
          itemsTotal: data.itemsTotal,
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

  const hasValidId = !Number.isNaN(subSectorId) && subSectorId > 0;

  return (
    <AppShell>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          background: T.paper,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: T.panel,
            borderBottom: `1px solid ${T.divider}`,
            padding: "18px 20px 16px",
          }}
        >
          <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 8 }}>
            <a
              href="/sectors"
              style={{
                fontWeight: 600,
                color: T.azure,
                textDecoration: "none",
              }}
            >
              Sectors
            </a>
            {primarySector && (
              <>
                {" / "}
                <a
                  href={`/sector/${primarySector.id}`}
                  style={{
                    fontWeight: 600,
                    color: T.azure,
                    textDecoration: "none",
                  }}
                >
                  {primarySector.sector_name}
                </a>
              </>
            )}
            {" / "}
            {headerLoaded ? subSectorName || "Sub-Sector" : "…"}
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.028em",
                  color: T.ink,
                  lineHeight: 1.1,
                }}
              >
                {headerLoaded ? (
                  subSectorName || "Sub-Sector"
                ) : (
                  <span
                    style={{
                      display: "inline-block",
                      height: 28,
                      width: 260,
                      background: T.hair,
                      borderRadius: 6,
                    }}
                  />
                )}
              </h1>
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              {hasValidId && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 36,
                    padding: "0 10px 0 14px",
                    borderRadius: 999,
                    border: `1px solid ${T.divider}`,
                    background: T.panel,
                  }}
                >
                  <InlineFollowButton
                    followKey="followed_sectors"
                    entityId={subSectorId}
                    label={subSectorName || "Sub-Sector"}
                    showLabel
                    icon="star"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px", background: T.panel }}>
          <ProfileSubnav
            sticky
            tabs={TABS.map((tab) => ({ id: tab.id, label: tab.name }))}
            activeTab={activeTab}
            onChange={(id) => setTab(id as TabId)}
          />
        </div>

        <main style={{ flex: 1, padding: "18px 20px 40px" }}>
          {activeTab === "all" && hasValidId && (
            <ScopedCompaniesPanel secondarySectorId={subSectorId} embedded />
          )}

          {activeTab === "transactions" && hasValidId && (
            <ScopedCorporateEventsPanel
              secondarySectorId={subSectorId}
              embedded
            />
          )}

          {activeTab === "insights" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  background: T.panel,
                  border: `1px solid ${T.divider}`,
                  borderRadius: T.rLg,
                  boxShadow:
                    "0 1px 3px rgba(16, 28, 70, 0.06), 0 1px 2px rgba(16, 28, 70, 0.04)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "13px 16px",
                    borderBottom: `1px solid ${T.hair}`,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 14.5,
                      fontWeight: 800,
                      color: T.ink,
                    }}
                  >
                    Insights &amp; Analysis
                  </h2>
                </div>
                <div style={{ padding: 16 }}>
                  {insightsLoading ? (
                    <div
                      style={{
                        padding: "40px 0",
                        textAlign: "center",
                        color: T.muted,
                        fontSize: 13.5,
                      }}
                    >
                      Loading articles...
                    </div>
                  ) : insightsError ? (
                    <div
                      style={{
                        padding: "16px 0",
                        textAlign: "center",
                        color: T.coral,
                        fontSize: 13.5,
                      }}
                    >
                      {insightsError}
                    </div>
                  ) : articles.length === 0 ? (
                    <div
                      style={{
                        padding: "40px 0",
                        textAlign: "center",
                        color: T.muted,
                        fontSize: 13.5,
                      }}
                    >
                      No articles found.
                    </div>
                  ) : (
                    <div style={INSIGHTS_GRID_STYLE}>
                      {articles.map((article) => (
                        <InsightsAnalysisCard key={article.id} article={article} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {insightsPagination.pageTotal > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CompactPagination
                    curPage={insightsPagination.curPage}
                    pageTotal={insightsPagination.pageTotal}
                    onPageChange={(page) => fetchInsights(page)}
                  />
                </div>
              )}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </AppShell>
  );
};

export default SubSectorPage;
