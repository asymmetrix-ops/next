"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";
// import { useRightClick } from "@/hooks/useRightClick";

// Types for API integration
interface Sector {
  id: number;
  sector_name: string;
  sector_type?: "Primary" | "Secondary" | string;
  Number_of_Companies: number;
  Number_of_Sub_Sectors?: number;
  Number_of_PE: number;
  Number_of_VC: number;
  Number_of_Public: number;
  Number_of_Private: number;
}

type SortField =
  | "sector_name"
  | "Number_of_Companies"
  | "Number_of_Sub_Sectors"
  | "Number_of_Public"
  | "Number_of_PE"
  | "Number_of_VC"
  | "Number_of_Private";
type SortDirection = "asc" | "desc";

interface SectorsResponse {
  sectors: Sector[];
  summary?: {
    total_sectors?: number;
    total_companies?: number;
    total_pe_companies?: number;
    total_vc_companies?: number;
    total_public_companies?: number;
    total_private_companies?: number;
  };
}

// ── Design tokens — exact values from ui_kits/landing/landing.css "--lp-*" ──
const LINE = "#E4E8F2";
const LINE_2 = "#EFF2F8";
const INK = "#0A0E1A";
const INK_2 = "#1E2536";
const MUTED = "#6B7488";
const EMPTY = "#6B7488";
const BLUE_50 = "#F1F4FE";
const BLUE_100 = "#E2E8FD";
const BLUE_600 = "#2A46EA";
const BLUE_700 = "#1F35C4";
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

// ── Sector card ──────────────────────────────────────────────────────────────
const SectorCard = ({
  sector,
  onClick,
  href,
}: {
  sector: Sector;
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
      className="sector-card"
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
          {sector.sector_name || "-"}
        </a>
        <span
          style={{
            marginLeft: "auto",
            color: hover ? BLUE_600 : "#8A93A8",
            flexShrink: 0,
            marginTop: 2,
            transition: "color 180ms",
          }}
        >
          <ArrowIcon />
        </span>
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 13 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 24,
            padding: "0 10px",
            borderRadius: 999,
            background: BLUE_50,
            border: `1px solid ${BLUE_100}`,
            fontSize: 12,
            fontWeight: 600,
            color: BLUE_700,
          }}
        >
          {formatNumber(sector.Number_of_Companies)} companies
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 24,
            padding: "0 10px",
            borderRadius: 999,
            background: "#F5F7FD",
            border: `1px solid ${LINE}`,
            fontSize: 12,
            fontWeight: 600,
            color: "#3D4657",
          }}
        >
          {formatNumber(sector.Number_of_Sub_Sectors || 0)} secondary
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: "auto" }}>
        {OWNERSHIP_ROWS.map((row, i) => {
          const count = sector[row.key] ?? 0;
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
          {formatNumber(sector.Number_of_Companies)}
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
          {sector.id ? (
            <InlineFollowButton
              followKey="followed_sectors"
              entityId={sector.id}
              label={sector.sector_name || ""}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const normalizeSectorName = (name: string | undefined | null): string =>
  (name || "").trim().toLowerCase();

function isPrimarySector(sector: Sector): boolean {
  if (sector.sector_type === "Primary") return true;
  if (sector.sector_type === "Secondary") return false;
  return (sector.Number_of_Sub_Sectors ?? 0) > 0;
}

const SectorsSection = () => {
  const router = useRouter();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("sector_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Preload mapping for potential downstream use; currently not used directly on this page
  const [, setSecondaryToPrimaryMap] = useState<Record<string, string>>({});

  const handleSectorClick = (sectorId: number) => {
    const basePath = `/sector/${sectorId}`;
    const href =
      searchTerm.trim().length > 0 ? `${basePath}?tab=subsectors` : basePath;
    router.push(href);
  };

  // Sort sectors
  const sortedSectors = [...sectors].sort((a, b) => {
    let aValue: string | number = a[sortField] ?? 0;
    let bValue: string | number = b[sortField] ?? 0;

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Fetch sector list from Upstash cache (populated by external cache engine).
  const fetchSectors = async () => {
    setLoading(true);
    setError(null);

    try {
      const trimmed = searchTerm.trim();
      const url =
        trimmed.length > 0
          ? `/api/sectors/list?search=${encodeURIComponent(trimmed)}`
          : "/api/sectors/list";

      const response = await fetch(url, { method: "GET" });

      if (response.status === 503) {
        setError("Sector list is not available yet. Please try again later.");
        setSectors([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: SectorsResponse = await response.json();
      const list = data.sectors || [];
      setSectors(
        trimmed.length > 0 ? list : list.filter(isPrimarySector)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sectors");
      console.error("Error fetching sectors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load mapping in background (used for counts enrichment if needed later)
    (async () => {
      try {
        const allSecondary =
          await locationsService.getAllSecondarySectorsWithPrimary();
        const map: Record<string, string> = {};
        if (Array.isArray(allSecondary)) {
          for (const sec of allSecondary) {
            const secName = (sec as { sector_name?: string }).sector_name;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const primary = (sec as any)?.related_primary_sector as
              | { sector_name?: string }
              | undefined;
            const primaryName = primary?.sector_name;
            if (secName && primaryName) {
              map[normalizeSectorName(secName)] = primaryName;
            }
          }
        }
        setSecondaryToPrimaryMap(map);
      } catch {
        // best-effort; ignore mapping load errors here
      }
    })();
    fetchSectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = `
    * {
      box-sizing: border-box;
    }
    .sectors-section {
      background: #F5F7FD;
      padding: 20px;
      width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
      min-height: calc(100vh - 200px);
    }
    .sectors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
      align-items: stretch;
    }
    .sector-card {
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
    .sectors-search-input::placeholder {
      color: #8A93A8;
    }
    .sectors-search-input:focus,
    .sectors-sort-select:focus {
      outline: none;
      border-color: #5C77F2;
      box-shadow: 0 0 0 4px rgba(42, 70, 234, 0.14);
    }

    @media (max-width: 768px) {
      .sectors-section {
        padding: 16px;
      }
      .sectors-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .sectors-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (min-width: 1025px) and (max-width: 1399px) {
      .sectors-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    @media (min-width: 1400px) {
      .sectors-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }
  `;

  return (
    <div className="sectors-section">
      <style dangerouslySetInnerHTML={{ __html: style }} />

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 22,
              padding: "0 10px",
              borderRadius: 999,
              background: BLUE_50,
              border: `1px solid ${BLUE_100}`,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: BLUE_600,
            }}
          >
            Sectors
          </span>
          <h1
            style={{
              margin: "6px 0 0",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.026em",
              color: INK,
              display: "flex",
              alignItems: "baseline",
              gap: 11,
            }}
          >
            Sector search
            <span style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>
              {sectors.length.toLocaleString()} matches
            </span>
          </h1>
        </div>
      </div>

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
            className="sectors-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchSectors();
            }}
            placeholder="Search sectors or secondary sectors…"
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
          onClick={() => fetchSectors()}
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
            className="sectors-sort-select"
            value={sortField}
            onChange={(e) => {
              const newField = e.target.value as SortField;
              if (sortField === newField) {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              } else {
                setSortField(newField);
                setSortDirection("desc");
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
            <option value="sector_name">Sector name</option>
            <option value="Number_of_Companies">Companies</option>
            <option value="Number_of_Sub_Sectors">Secondary sectors</option>
            <option value="Number_of_Public">Public companies</option>
            <option value="Number_of_PE">PE-owned companies</option>
            <option value="Number_of_VC">VC-backed companies</option>
            <option value="Number_of_Private">Private companies</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
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
            {sectors.length.toLocaleString()}
          </strong>{" "}
          sectors
        </span>
      </div>

      {loading ? (
        <div className="loading">Loading sectors...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="sectors-grid">
          {sortedSectors.map((sector) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              href={
                searchTerm.trim().length > 0
                  ? `/sector/${sector.id}?tab=subsectors`
                  : `/sector/${sector.id}`
              }
              onClick={() => handleSectorClick(sector.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SectorsPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <SectorsSection />
      <Footer />
    </div>
  );
};

export default SectorsPage;
