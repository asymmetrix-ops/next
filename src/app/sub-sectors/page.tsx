"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import CompactPagination from "@/components/ui/CompactPagination";
import {
  SEARCH_DASHBOARD_SHELL,
  SEARCH_DASHBOARD_INNER,
  SEARCH_DASHBOARD_HEADER_ROW,
  SEARCH_DASHBOARD_EYEBROW,
  SEARCH_DASHBOARD_TITLE,
  SEARCH_DASHBOARD_MATCH_COUNT,
} from "@/components/search/searchDashboardLayout";

// Types for API integration
interface SubSector {
  id: number;
  sector_name: string;
  Number_of_Companies: number;
  Number_of_PE: number;
  Number_of_VC: number;
  Number_of_Public: number;
  Number_of_Private: number;
}

type SortField =
  | "sector_name"
  | "Number_of_Companies"
  | "Number_of_Public"
  | "Number_of_PE"
  | "Number_of_VC"
  | "Number_of_Private";
type SortDirection = "asc" | "desc";

const SORT_BY_API_KEY: Record<SortField, string> = {
  sector_name: "name",
  Number_of_Companies: "companies",
  Number_of_Public: "public",
  Number_of_PE: "pe_owned",
  Number_of_VC: "vc_backed",
  Number_of_Private: "private",
};

interface SecondarySectorApiItem {
  id: number;
  sector_name: string;
  total_companies: number;
  public_count: number;
  pe_owned_count: number;
  vc_backed_count: number;
  private_count: number;
}

interface SecondarySectorsApiResponse {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  items: SecondarySectorApiItem[];
}

const API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV";

// ── Design tokens — exact values from ui_kits/landing/landing.css "--lp-*" ──
const LINE = "#E4E8F2";
const LINE_2 = "#EFF2F8";
const INK = "#0A0E1A";
const INK_2 = "#1E2536";
const MUTED = "#6B7488";
const EMPTY = "#6B7488";
const BLUE_100 = "#E2E8FD";
const BLUE_600 = "#2A46EA";
const GREEN_50 = "#ECFDF5";
const GREEN_200 = "#A7F3D0";
const GREEN_700 = "#047857";
const R_LG = 16;
const SH_SM = "0 1px 3px rgba(16, 28, 70, 0.06), 0 1px 2px rgba(16, 28, 70, 0.04)";
const SH_CARD = "0 2px 6px rgba(16, 28, 70, 0.05), 0 12px 32px rgba(16, 28, 70, 0.07)";

const OWNERSHIP_ROWS: Array<{
  key: "Number_of_Public" | "Number_of_PE" | "Number_of_VC" | "Number_of_Private";
  label: string;
  dot: string;
}> = [
  { key: "Number_of_Public", label: "Public", dot: "#7A5BD0" },
  { key: "Number_of_PE", label: "PE-owned", dot: "#3D5BF3" },
  { key: "Number_of_VC", label: "VC-backed", dot: "#17A05C" },
  { key: "Number_of_Private", label: "Private", dot: "#E0A32E" },
];

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// ── Sub-sector card ──────────────────────────────────────────────────────────
const SubSectorCard = ({
  subSector,
  onClick,
  href,
}: {
  subSector: SubSector;
  onClick: () => void;
  href: string;
}) => {
  const [hover, setHover] = useState(false);
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString();
  };

  return (
    <article
      className="sub-sector-card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1px solid ${hover ? BLUE_100 : LINE}`,
        borderRadius: R_LG,
        boxShadow: hover ? SH_CARD : SH_SM,
        padding: "15px 16px 14px",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "box-shadow 180ms, border-color 180ms, transform 180ms",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        minWidth: 0,
        height: "100%",
      }}
    >
      <h2
        style={{
          margin: "0 0 10px",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-0.018em",
          lineHeight: 1.3,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <a
          href={href}
          onClick={(e) => e.stopPropagation()}
          style={{ color: BLUE_600, textDecoration: "none" }}
        >
          {subSector.sector_name || "-"}
        </a>
        <a
          href={href}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open ${subSector.sector_name || "sub-sector"} profile`}
          style={{
            marginLeft: "auto",
            color: hover ? BLUE_600 : "#8A93A8",
            flexShrink: 0,
            marginTop: 2,
            transition: "color 180ms",
            display: "inline-flex",
          }}
        >
          <ArrowIcon />
        </a>
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 13 }}>
        <a
          href={`/sub-sector/${subSector.id}?tab=all`}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 24,
            padding: "0 10px",
            borderRadius: 999,
            background: GREEN_50,
            border: `1px solid ${GREEN_200}`,
            fontSize: 12,
            fontWeight: 600,
            color: GREEN_700,
            textDecoration: "none",
          }}
        >
          {formatNumber(subSector.Number_of_Companies)} companies
        </a>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: "auto" }}>
        {OWNERSHIP_ROWS.map((row, i) => {
          const count = subSector[row.key] ?? 0;
          const isZero = count === 0;
          return (
            <div
              key={row.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderTop: i === 0 ? "none" : `1px solid ${LINE_2}`,
                fontSize: 12.5,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: isZero ? LINE : row.dot,
                }}
              />
              <span
                style={{
                  color: isZero ? EMPTY : "#3D4657",
                  fontWeight: 500,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                  color: isZero ? EMPTY : INK_2,
                }}
              >
                {formatNumber(count)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 11,
          paddingTop: 10,
          borderTop: `1px solid ${LINE}`,
          fontSize: 12,
          color: MUTED,
        }}
      >
        Total{" "}
        <b style={{ color: INK, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {formatNumber(subSector.Number_of_Companies)}
        </b>
        <a
          href={href}
          onClick={(e) => e.stopPropagation()}
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 600,
            color: BLUE_600,
            textDecoration: "none",
          }}
        >
          View companies →
        </a>
        <div onClick={(e) => e.stopPropagation()}>
          {subSector.id ? (
            <InlineFollowButton
              followKey="followed_sectors"
              entityId={subSector.id}
              label={subSector.sector_name || ""}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
};

function mapApiItem(item: SecondarySectorApiItem): SubSector {
  return {
    id: item.id,
    sector_name: item.sector_name,
    Number_of_Companies: item.total_companies ?? 0,
    Number_of_Public: item.public_count ?? 0,
    Number_of_PE: item.pe_owned_count ?? 0,
    Number_of_VC: item.vc_backed_count ?? 0,
    Number_of_Private: item.private_count ?? 0,
  };
}

const SubSectorsSection = () => {
  const router = useRouter();
  const [subSectors, setSubSectors] = useState<SubSector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("sector_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeSearch, setActiveSearch] = useState<string>("");
  const [curPage, setCurPage] = useState(1);
  const [pageTotal, setPageTotal] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const handleSubSectorClick = (subSectorId: number) => {
    router.push(`/sub-sector/${subSectorId}`);
  };

  // Single API call per page — the endpoint is server-paginated (25/page),
  // server-searched and server-sorted across the whole list, so we never
  // fetch more than the page being shown.
  const fetchPage = useCallback(
    async (
      uiPage: number,
      search: string,
      sortField: SortField,
      sortDirection: SortDirection
    ) => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setError("Authentication required");
          return;
        }

        const params = new URLSearchParams({
          page: String(uiPage - 1),
          sort_by: SORT_BY_API_KEY[sortField],
          sort_dir: sortDirection,
        });
        if (search) params.set("search", search);

        const resp = await fetch(
          `${API_BASE}/sectors/secondary_search?${params.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!resp.ok) {
          throw new Error(`API request failed: ${resp.status} ${resp.statusText}`);
        }
        const data: SecondarySectorsApiResponse = await resp.json();

        setSubSectors((data.items || []).map(mapApiItem));
        setCurPage(data.page || uiPage);
        setPageTotal(data.total_pages || 1);
        setTotalCount(data.total_count || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch sub-sectors");
        console.error("Error fetching sub-sectors:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSearch = () => {
    const trimmed = searchTerm.trim();
    setActiveSearch(trimmed);
    fetchPage(1, trimmed, sortField, sortDirection);
  };

  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    fetchPage(1, activeSearch, field, direction);
  };

  useEffect(() => {
    fetchPage(1, "", sortField, sortDirection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = `
    * {
      box-sizing: border-box;
    }
    .sub-sectors-section {
      background: #F5F7FD;
      width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
      min-height: calc(100vh - 200px);
    }
    .sub-sectors-content {
      padding: 20px 28px;
      width: 100%;
      box-sizing: border-box;
    }
    .sub-sectors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
      align-items: stretch;
    }
    .sub-sector-card {
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: ${MUTED};
    }
    .error {
      text-align: center;
      padding: 20px;
      color: #A62E22;
      background-color: #FCEAE7;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .sub-sectors-search-input::placeholder {
      color: #8A93A8;
    }
    .sub-sectors-search-input:focus,
    .sub-sectors-sort-select:focus {
      outline: none;
      border-color: #5C77F2;
      box-shadow: 0 0 0 4px rgba(42, 70, 234, 0.14);
    }

    @media (max-width: 768px) {
      .sub-sectors-content {
        padding: 16px;
      }
      .sub-sectors-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .sub-sectors-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (min-width: 1025px) and (max-width: 1399px) {
      .sub-sectors-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    @media (min-width: 1400px) {
      .sub-sectors-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }
  `;

  return (
    <div className="sub-sectors-section">
      <style dangerouslySetInnerHTML={{ __html: style }} />

      <div style={SEARCH_DASHBOARD_SHELL}>
        <div style={SEARCH_DASHBOARD_INNER}>
          <div style={SEARCH_DASHBOARD_HEADER_ROW}>
            <div>
              <div style={SEARCH_DASHBOARD_EYEBROW}>Sub-Sectors</div>
              <h1 style={SEARCH_DASHBOARD_TITLE}>
                Sub-sector search
                <span style={SEARCH_DASHBOARD_MATCH_COUNT}>
                  {totalCount.toLocaleString()} matches
                </span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="sub-sectors-content">
      {/* Controls card */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${LINE}`,
          borderRadius: R_LG,
          boxShadow: SH_SM,
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 auto", maxWidth: 460 }}>
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#8A93A8",
              pointerEvents: "none",
              display: "flex",
            }}
          >
            <SearchIcon />
          </span>
          <input
            className="sub-sectors-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Search sub-sectors…"
            style={{
              width: "100%",
              height: 38,
              padding: "0 14px 0 38px",
              borderRadius: 999,
              border: `1px solid ${LINE}`,
              background: "#fff",
              fontSize: 13,
              color: INK,
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleSearch}
          style={{
            height: 38,
            padding: "0 20px",
            borderRadius: 999,
            border: "none",
            background: BLUE_600,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(42, 70, 234, 0.32)",
          }}
        >
          Search
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: MUTED }}>
          Sort by
          <select
            className="sub-sectors-sort-select"
            value={sortField}
            onChange={(e) => {
              const newField = e.target.value as SortField;
              if (sortField === newField) {
                handleSortChange(newField, sortDirection === "asc" ? "desc" : "asc");
              } else {
                handleSortChange(newField, "desc");
              }
            }}
            style={{
              height: 38,
              border: `1px solid ${LINE}`,
              borderRadius: 999,
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#3D4657",
              padding: "0 14px",
              cursor: "pointer",
            }}
          >
            <option value="sector_name">Sub-sector name</option>
            <option value="Number_of_Companies">Companies</option>
            <option value="Number_of_Public">Public companies</option>
            <option value="Number_of_PE">PE-owned companies</option>
            <option value="Number_of_VC">VC-backed companies</option>
            <option value="Number_of_Private">Private companies</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => handleSortChange(sortField, sortDirection === "asc" ? "desc" : "asc")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 38,
            padding: "0 14px",
            borderRadius: 999,
            border: `1px solid ${LINE}`,
            background: "#fff",
            fontSize: 13,
            fontWeight: 600,
            color: "#3D4657",
            cursor: "pointer",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: sortDirection === "asc" ? "none" : "rotate(180deg)",
              transition: "transform 150ms",
            }}
          >
            <path d="m5 12 7-7 7 7" />
            <path d="M12 19V5" />
          </svg>
          {sortDirection === "asc" ? "Ascending" : "Descending"}
        </button>

        <span style={{ marginLeft: "auto", fontSize: 13, color: MUTED }}>
          <strong style={{ color: INK, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {totalCount.toLocaleString()}
          </strong>{" "}
          sub-sectors
        </span>
      </div>

      {loading ? (
        <div className="loading">Loading sub-sectors...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="sub-sectors-grid">
            {subSectors.map((subSector) => (
              <SubSectorCard
                key={subSector.id}
                subSector={subSector}
                href={`/sub-sector/${subSector.id}`}
                onClick={() => handleSubSectorClick(subSector.id)}
              />
            ))}
          </div>
          {pageTotal > 1 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <CompactPagination
                curPage={curPage}
                pageTotal={pageTotal}
                onPageChange={(page) =>
                  fetchPage(page, activeSearch, sortField, sortDirection)
                }
              />
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

const SubSectorsPage = () => {
  return (
    <AppShell>
    <div className="min-h-screen">
      <SubSectorsSection />
      <Footer />
    </div>
    </AppShell>
  );
};

export default SubSectorsPage;
