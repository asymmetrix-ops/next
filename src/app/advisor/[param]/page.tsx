"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAdvisorProfile } from "../../../hooks/useAdvisorProfile";
import {
  formatCurrency,
  formatDate,
  getAdvisorYearFoundedDisplay,
} from "../../../utils/advisorHelpers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useRightClick } from "../../../hooks/useRightClick";
import IndividualCards, { type IndividualCardItem } from "@/components/shared/IndividualCards";
import { locationsService } from "@/lib/locationsService";
import SearchableSelect from "@/components/ui/SearchableSelect";

// Types for LinkedIn History Chart
interface LinkedInHistory {
  date: string;
  employees_count: number;
}

// Types for Corporate Events (develop/new endpoint payload)
interface AdvisorCorporateEventItem {
  id: number;
  description?: string | null;
  announcement_date?: string | null;
  deal_type?: string | null;
  company_advised_id?: number | null;
  company_advised_name?: string | null;
  company_advised_role?: string | null;
  enterprise_value_m?: string | number | null;
  currency_name?: string | null;
  // API updated: these are arrays (not JSON strings)
  advisor_individuals?: Array<{ id?: number; name?: string }> | null;
  other_advisors?: Array<{
    id?: number;
    individuals_id?: number[];
    advisor_company_id?: number;
    advisor_company_name?: string;
  }> | null;
  primary_sectors?: Array<{
    id?: number;
    is_derived?: boolean;
    sector_name?: string;
    sector_importance?: string;
  }> | null;
}

// Utility function for chart date formatting
const formatChartDate = (dateString: string): string => {
  const [year, month] = dateString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

// LinkedIn History Chart Component
const LinkedInHistoryChart = ({ data }: { data: LinkedInHistory[] }) => {
  const chartData = data.map((item) => ({
    date: formatChartDate(item.date),
    count: item.employees_count,
    fullDate: item.date,
  }));

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      value: number;
      dataKey: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>{`${label}`}</p>
          <p style={{ margin: 0, color: "#0075df" }}>
            {`Employees: ${formatNumber(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: "300px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0075df"
            strokeWidth={2}
            dot={{ fill: "#0075df", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#0075df" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div style={{ width: "80px", height: "80px", position: "relative" }}>
        <Image
          src={`data:image/jpeg;base64,${logo}`}
          alt={`${name} logo`}
          fill
          style={{ objectFit: "cover", borderRadius: "8px" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "80px",
        height: "80px",
        backgroundColor: "#f7fafc",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        color: "#718096",
        fontWeight: "bold",
      }}
    >
      {name.charAt(0)}
    </div>
  );
};

// Format number with commas
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

export default function AdvisorProfilePage() {
  const params = useParams();
  const advisorId = parseInt(params.param as string);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [linkedInHistory, setLinkedInHistory] = useState<LinkedInHistory[]>([]);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  // Roles fetched from the LinkedIn/company endpoint (includes job titles)
  interface RoleItem {
    id: number;
    individuals_id: number;
    Individual_text?: string;
    advisor_individuals?: string;
    job_titles_id?: Array<{ id?: number; job_title: string }>;
  }
  const [rolesCurrent, setRolesCurrent] = useState<RoleItem[]>([]);
  const [rolesPast, setRolesPast] = useState<RoleItem[]>([]);
  const [linkedInHistoryLoading, setLinkedInHistoryLoading] = useState(false);
  // Sector filter state
  const [filterPrimarySectors, setFilterPrimarySectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [filterSecondarySectors, setFilterSecondarySectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [selectedFilterPrimary, setSelectedFilterPrimary] = useState<number[]>([]);
  const [selectedFilterSecondary, setSelectedFilterSecondary] = useState<number[]>([]);
  const [loadingFilterPrimary, setLoadingFilterPrimary] = useState(false);
  const [loadingFilterSecondary, setLoadingFilterSecondary] = useState(false);
  const { createClickableElement } = useRightClick();

  const { advisorData, corporateEvents, loading, error } = useAdvisorProfile({
    advisorId,
  });

  // Removed: handleAdvisorClick (replaced with createClickableElement in list)

  // Replaced corporate event navigation with right-clickable links via createClickableElement

  // Removed unused handler; replaced by mailto link button

  const handleToggleEvents = () => {
    setEventsExpanded(!eventsExpanded);
  };

  // Fetch LinkedIn history data using the same API pattern as company page
  const fetchLinkedInHistory = useCallback(async () => {
    setLinkedInHistoryLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Get_new_company/${advisorId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `LinkedIn History API request failed: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Advisor LinkedIn history API response:", data);

      // Extract employee count data from the same field as company page
      const employeeData =
        data.Company?._companies_employees_count_monthly || [];

      // Transform the data to match our interface - same format as company page
      const historyData = employeeData.map(
        (item: { date?: string; employees_count?: number }) => ({
          date: item.date || "",
          employees_count: item.employees_count || 0,
        })
      );

      setLinkedInHistory(historyData);

      // Capture roles (with job titles) if provided by this endpoint
      const currentRoles: RoleItem[] = Array.isArray(
        data.Managmant_Roles_current
      )
        ? data.Managmant_Roles_current
        : [];
      const pastRoles: RoleItem[] = Array.isArray(data.Managmant_Roles_past)
        ? data.Managmant_Roles_past
        : [];
      setRolesCurrent(currentRoles);
      setRolesPast(pastRoles);
    } catch (err) {
      console.error("Error fetching advisor LinkedIn history:", err);
      // Don't set main error state for LinkedIn history loading failure
    } finally {
      setLinkedInHistoryLoading(false);
    }
  }, [advisorId]);

  useEffect(() => {
    if (advisorId) {
      fetchLinkedInHistory();
    }
  }, [advisorId, fetchLinkedInHistory]);

  // Update page title when advisor data is loaded
  useEffect(() => {
    if (advisorData?.Advisor?.name && typeof document !== "undefined") {
      document.title = `Asymmetrix – ${advisorData.Advisor.name}`;
    }
  }, [advisorData?.Advisor?.name]);

  // Fetch primary sectors for deal filters
  useEffect(() => {
    let cancelled = false;
    const fetchPrimary = async () => {
      setLoadingFilterPrimary(true);
      try {
        const data = await locationsService.getPrimarySectors();
        if (!cancelled) setFilterPrimarySectors(data);
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setLoadingFilterPrimary(false);
      }
    };
    fetchPrimary();
    return () => { cancelled = true; };
  }, []);

  // Fetch secondary sectors when primary selection changes
  useEffect(() => {
    if (selectedFilterPrimary.length === 0) {
      setFilterSecondarySectors([]);
      setSelectedFilterSecondary([]);
      return;
    }
    let cancelled = false;
    const fetchSecondary = async () => {
      setLoadingFilterSecondary(true);
      try {
        const data = await locationsService.getSecondarySectors(selectedFilterPrimary);
        if (!cancelled) setFilterSecondarySectors(data);
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setLoadingFilterSecondary(false);
      }
    };
    fetchSecondary();
    return () => { cancelled = true; };
  }, [selectedFilterPrimary]);

  if (loading) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div>Loading advisor data...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h2>Error Loading Advisor</h2>
            <p>{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!advisorData) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div>Advisor not found</div>
        </div>
        <Footer />
      </div>
    );
  }

  const {
    Advisor,
    Portfolio_companies_count,
    Advisors_individuals,
  } = advisorData;

  const hq = `${Advisor._locations?.City || ""}, ${
    Advisor._locations?.State__Province__County || ""
  }, ${Advisor._locations?.Country || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  // Corporate Events (develop/new payload) helpers
  const safeEvents: AdvisorCorporateEventItem[] = Array.isArray(corporateEvents)
    ? (corporateEvents as unknown as AdvisorCorporateEventItem[])
    : [];

  // Client-side sector filtering
  const filteredEvents = (() => {
    if (selectedFilterPrimary.length === 0 && selectedFilterSecondary.length === 0) return safeEvents;
    return safeEvents.filter((event) => {
      const sectors = coerceArray<{ id?: number; sector_name?: string; sector_importance?: string }>(event.primary_sectors);
      if (selectedFilterPrimary.length > 0) {
        const primaryIds = sectors
          .filter((s) => String(s.sector_importance || "").toLowerCase().includes("primary"))
          .map((s) => s.id);
        if (!selectedFilterPrimary.some((id) => primaryIds.includes(id))) return false;
      }
      if (selectedFilterSecondary.length > 0) {
        const secondaryIds = sectors
          .filter((s) => !String(s.sector_importance || "").toLowerCase().includes("primary"))
          .map((s) => s.id);
        if (!selectedFilterSecondary.some((id) => secondaryIds.includes(id))) return false;
      }
      return true;
    });
  })();

  const coerceArray = <T,>(raw: unknown): T[] => {
    if (Array.isArray(raw)) return raw as T[];
    if (raw === null || raw === undefined) return [];
    if (typeof raw !== "string") return [];
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];
    try {
      // Some payloads may contain escaped quotes (\u0022) from Xano
      const normalized = trimmed.replace(/\\u0022/g, '"');
      const parsed = JSON.parse(normalized) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };

  const style = `
    .advisor-detail-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .advisor-content {
      flex: 1;
      padding: 32px;
      width: 100%;
    }
    .advisor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .advisor-title-section {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }
    .advisor-title {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .report-button {
      padding: 8px 16px;
      background-color: #16a34a;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .advisor-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .advisor-section {
      background-color: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-title {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: bold;
    }
    .info-sections-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
      gap: 24px;
      align-items: stretch;
    }
    .info-sections-row .advisor-section {
      margin-bottom: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
      font-size: 13px;
    }
    .info-value {
      color: #6b7280;
      font-size: 13px;
    }
    .description-text {
      white-space: pre-wrap;
    }
    .description-collapsed {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
    .description-footer {
      display: flex;
      justify-content: flex-start;
      margin-top: 8px;
    }
    .corporate-events-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .corporate-events-footer {
      display: flex;
      justify-content: flex-start;
      margin-top: 12px;
    }
    .toggle-button-primary {
      background-color: #0075df;
      color: #ffffff;
      border: 1px solid #0075df;
      border-radius: 6px;
      padding: 8px 14px;
      font-weight: 600;
      line-height: 1;
    }
    .toggle-button-primary:hover {
      background-color: #005bb5;
      border-color: #005bb5;
    }
    .toggle-button {
      color: #3b82f6;
      text-decoration: none;
      font-size: 14px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      /* Prevent horizontal "jump" when label changes */
      min-width: 86px;
      text-align: left;
    }
    .events-table-container {
      /* no overflow-x: auto — table must always fit without scrolling */
    }
    .events-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      /* Fixed layout: columns use assigned widths; description wraps */
      table-layout: fixed;
    }
    /* Column width distribution (8 cols, description takes the flex space) */
    .events-table th:nth-child(1) { width: 22%; }  /* Description – wraps */
    .events-table th:nth-child(2) { width: 10%; }  /* Deal Date */
    .events-table th:nth-child(3) { width: 10%; }  /* Type */
    .events-table th:nth-child(4) { width: 11%; }  /* Counterparty Advised */
    .events-table th:nth-child(5) { width: 13%; }  /* Client Name */
    .events-table th:nth-child(6) { width: 17%; }  /* Sector(s) */
    .events-table th:nth-child(7) { width: 9%; }   /* Enterprise Value */
    .events-table th:nth-child(8) { width: 8%; }   /* Advisor */
    .events-table thead tr {
      border-bottom: 2px solid #e2e8f0;
    }
    .events-table th {
      text-align: left;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
    }
    .events-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }
    .events-table td {
      padding: 6px 8px;
      font-size: 11px;
      word-break: normal;
      overflow-wrap: normal;
      white-space: normal;
    }
    /* Description: wraps at word boundaries, never mid-character */
    .events-table th:nth-child(1),
    .events-table td:nth-child(1) {
      overflow-wrap: break-word;
      word-break: normal;
    }
    /* Short columns: keep on one line */
    .events-table td:nth-child(2),
    .events-table th:nth-child(2),
    .events-table td:nth-child(3),
    .events-table th:nth-child(3) {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nowrap-token { display: inline-block; white-space: nowrap; }
    .nowrap-token:not(:last-child)::after { content: ","; margin-right: 4px; }
    .nowrap-token .advisor-link {
      word-break: keep-all !important;
      overflow-wrap: normal !important;
      white-space: nowrap !important;
      line-break: auto !important;
    }
    /* Prevent splitting individual other-counterparty names */
    .other-counterparty-name {
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: nowrap;
      display: inline-block;
    }
    .other-counterparty-name .advisor-link {
      word-break: keep-all !important;
      overflow-wrap: normal !important;
      white-space: nowrap !important;
    }
    .event-link {
      color: inherit;
      text-decoration: none;
      cursor: pointer;
      word-break: normal;
      overflow-wrap: break-word;
      white-space: normal;
    }
    .event-link:hover {
      color: #005bb5;
      text-decoration: none;
    }
    .advisor-link {
      color: #3b82f6;
      text-decoration: none;
      cursor: pointer;
      word-break: normal;
      overflow-wrap: break-word;
      white-space: normal;
    }
    .advisor-link:hover {
      text-decoration: underline;
    }
    .no-events {
      color: #6b7280;
      text-align: center;
      padding: 20px;
    }
    .events-cards {
      display: none;
    }
    .event-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .event-card-title {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      cursor: pointer;
      margin-bottom: 12px;
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-break: anywhere;
    }
    .event-card-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
    }
    .event-card-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .event-card-info-label {
      font-weight: 600;
      color: #374151;
    }
    .event-card-info-item:nth-child(2) .event-card-info-value {
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: nowrap;
      line-break: normal;
    }
      font-size: 12px;
    }
    .event-card-info-value {
      color: #6b7280;
      font-size: 12px;
      /* Global rule: do NOT split words mid-word */
      word-break: normal;
      overflow-wrap: normal;
      white-space: normal;
      line-break: normal;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .pill { display: inline-block; padding: 2px 8px; font-size: 12px; border-radius: 999px; font-weight: 600; }
    .pill-blue { background-color: #e6f0ff; color: #1d4ed8; }
    .pill-green { background-color: #dcfce7; color: #15803d; }
    /* Deals sector filter */
    .deals-filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0 16px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 14px;
    }
    .deals-filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 200px;
      flex: 1;
    }
    .deals-filter-label {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .deals-filter-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }
    .deals-filter-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #e6f0ff;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .deals-filter-tag-secondary {
      background: #dcfce7;
      color: #15803d;
    }
    .deals-filter-tag-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
      font-size: 13px;
      line-height: 1;
      padding: 0;
      display: flex;
      align-items: center;
    }
    .deals-filter-clear {
      background: none;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 11px;
      color: #6b7280;
      cursor: pointer;
      align-self: flex-end;
      white-space: nowrap;
    }
    .deals-filter-clear:hover { background: #f3f4f6; }
    .deals-filter-result-count {
      font-size: 11px;
      color: #6b7280;
      align-self: flex-end;
      padding-bottom: 6px;
      white-space: nowrap;
    }
    /* Management/Individual cards hover effects */
    .management-card:hover {
      background-color: #e6f0ff !important;
      border-color: #0075df !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 117, 223, 0.1);
    }
    /* Advisors: auto-fill columns based on available width */
    .advisor-detail-page .management-grid {
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
      gap: 10px !important;
    }
    .advisor-detail-page .management-card {
      padding: 8px !important;
      border-radius: 6px !important;
    }

    @media (max-width: 768px) {
      .advisor-content {
        padding: 16px !important;
      }
      .advisor-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
      }
      .advisor-title-section {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 12px !important;
      }
      .advisor-title {
        font-size: 24px !important;
      }
      .report-button {
        align-self: flex-start !important;
        width: fit-content !important;
      }
      .advisor-layout {
        gap: 16px !important;
      }
      .info-sections-row {
        grid-template-columns: 1fr !important;
      }
      .advisor-section {
        padding: 16px !important;
      }
      .section-title {
        font-size: 18px !important;
        margin-bottom: 12px !important;
      }
      .events-table-container {
        display: none !important;
      }
      .events-cards {
        display: block !important;
      }
      .corporate-events-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 8px !important;
      }
      .advisor-detail-page .management-grid {
        grid-template-columns: 1fr !important;
      }
    }

    @media (min-width: 769px) {
      .events-cards {
        display: none !important;
      }
      .events-table-container {
        display: block !important;
      }
    }
  `;

  return (
    <div className="advisor-detail-page">
      {Advisor?.name && (
        <Head>
          <title>{`Asymmetrix – ${Advisor.name}`}</title>
        </Head>
      )}
      <Header />

      <div className="advisor-content">
        {/* Page Header */}
        <div className="advisor-header">
          <div className="advisor-title-section">
            <CompanyLogo
              logo={Advisor._linkedin_data_of_new_company?.linkedin_logo || ""}
              name={Advisor.name}
            />
            <div>
              <h1 className="advisor-title">{Advisor.name}</h1>
            </div>
          </div>
          <a
            className="report-button"
            href={`mailto:asymmetrix@asymmetrixintelligence.com?subject=${encodeURIComponent(
              `Contribute Advisor Data – ${Advisor.name} (ID ${Advisor.id})`
            )}&body=${encodeURIComponent(
              "Please describe the data you would like to contribute for this advisor page."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contribute Data
          </a>
        </div>

        <div className="advisor-layout">
          {/* Deals Advised */}
          <div className="advisor-section">
              <div className="corporate-events-header">
                <h2 className="section-title">Deals Advised</h2>
              </div>

              {/* Sector Filters */}
              <div className="deals-filter-bar">
                <div className="deals-filter-group">
                  <span className="deals-filter-label">Primary Sector</span>
                  <SearchableSelect
                    options={filterPrimarySectors.map((s) => ({ value: s.id, label: s.sector_name }))}
                    value=""
                    onChange={(value) => {
                      if (typeof value === "number" && !selectedFilterPrimary.includes(value)) {
                        setSelectedFilterPrimary((prev) => [...prev, value]);
                      }
                    }}
                    placeholder={loadingFilterPrimary ? "Loading…" : "Filter by primary sector"}
                    disabled={loadingFilterPrimary}
                    style={{ padding: "7px 10px", fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "6px", width: "100%", color: "#4a5568" }}
                  />
                  {selectedFilterPrimary.length > 0 && (
                    <div className="deals-filter-tags">
                      {selectedFilterPrimary.map((id) => {
                        const s = filterPrimarySectors.find((x) => x.id === id);
                        return (
                          <span key={id} className="deals-filter-tag">
                            {s?.sector_name ?? id}
                            <button
                              className="deals-filter-tag-remove"
                              onClick={() => setSelectedFilterPrimary((prev) => prev.filter((x) => x !== id))}
                            >×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="deals-filter-group">
                  <span className="deals-filter-label">Sub-Sector</span>
                  <SearchableSelect
                    options={filterSecondarySectors.map((s) => ({ value: s.id, label: s.sector_name }))}
                    value=""
                    onChange={(value) => {
                      if (typeof value === "number" && !selectedFilterSecondary.includes(value)) {
                        setSelectedFilterSecondary((prev) => [...prev, value]);
                      }
                    }}
                    placeholder={
                      loadingFilterSecondary
                        ? "Loading…"
                        : selectedFilterPrimary.length === 0
                        ? "Select primary first"
                        : "Filter by sub-sector"
                    }
                    disabled={loadingFilterSecondary || selectedFilterPrimary.length === 0}
                    style={{ padding: "7px 10px", fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "6px", width: "100%", color: "#4a5568" }}
                  />
                  {selectedFilterSecondary.length > 0 && (
                    <div className="deals-filter-tags">
                      {selectedFilterSecondary.map((id) => {
                        const s = filterSecondarySectors.find((x) => x.id === id);
                        return (
                          <span key={id} className={`deals-filter-tag deals-filter-tag-secondary`}>
                            {s?.sector_name ?? id}
                            <button
                              className="deals-filter-tag-remove"
                              onClick={() => setSelectedFilterSecondary((prev) => prev.filter((x) => x !== id))}
                            >×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {(selectedFilterPrimary.length > 0 || selectedFilterSecondary.length > 0) && (
                  <>
                    <span className="deals-filter-result-count">
                      {filteredEvents.length} of {safeEvents.length} deals
                    </span>
                    <button
                      className="deals-filter-clear"
                      onClick={() => { setSelectedFilterPrimary([]); setSelectedFilterSecondary([]); }}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>

              {filteredEvents.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="events-table-container">
                    <table className="events-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Deal Date</th>
                          <th>Type</th>
                          <th>Counterparty Advised</th>
                          <th>Client Name</th>
                          <th>Sector(s)</th>
                          <th>Enterprise Value</th>
                          <th>Advisor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.slice(
                          0,
                          eventsExpanded ? undefined : 10
                        ).map((event, index) => {
                          const companyAdvisedId = event.company_advised_id ?? null;
                          const companyAdvisedName =
                            (event.company_advised_name || "").trim() || "—";
                          const companyAdvisedRoleRaw = String(
                            event.company_advised_role || ""
                          ).trim();
                          const companyAdvisedRole = companyAdvisedRoleRaw.toLowerCase();
                          const companyAdvisedHref =
                            companyAdvisedId && companyAdvisedName !== "—"
                              ? companyAdvisedRole.includes("investor")
                                ? `/investors/${companyAdvisedId}`
                                : `/company/${companyAdvisedId}`
                              : undefined;

                          const getEnterpriseValue = () => {
                            const value = event.enterprise_value_m;
                            const currency = (event.currency_name || "").trim();
                            if (value === null || value === undefined || value === "")
                              return "—";
                            if (currency) {
                              return formatCurrency(String(value), currency);
                            }
                            const n = Number(String(value).replace(/,/g, ""));
                            return Number.isFinite(n)
                              ? `${Math.round(n).toLocaleString()}M`
                              : String(value);
                          };

                          const individuals = coerceArray<{
                            id?: number;
                            name?: string;
                          }>(event.advisor_individuals);

                          const sectors = coerceArray<{
                            id?: number;
                            is_derived?: boolean;
                            sector_name?: string;
                            sector_importance?: string;
                          }>(event.primary_sectors)
                            .filter(
                              (s) =>
                                s &&
                                typeof s.id === "number" &&
                                String(s.sector_name || "").trim().length > 0
                            )
                            .map((s) => ({
                              id: s.id as number,
                              name: String(s.sector_name).trim(),
                              importance: String(s.sector_importance || "").trim(),
                              isDerived: Boolean(s.is_derived),
                            }));

                          // De-dupe, preferring non-derived tags when available
                          const sectorKey = (s: {
                            id: number;
                            importance: string;
                          }) => `${s.id}:${s.importance.toLowerCase()}`;
                          const dedupedSectors = (() => {
                            const sorted = [...sectors].sort((a, b) => {
                              if (a.isDerived === b.isDerived) return 0;
                              return a.isDerived ? 1 : -1;
                            });
                            const m = new Map<string, (typeof sorted)[number]>();
                            for (const s of sorted) {
                              const key = sectorKey(s);
                              if (!m.has(key)) m.set(key, s);
                            }
                            return Array.from(m.values());
                          })();

                          return (
                            <tr key={index}>
                              <td>
                                {createClickableElement(
                                  `/corporate-event/${event.id}`,
                                  event.description || "—",
                                  "event-link"
                                )}
                              </td>
                              <td>
                                {event.announcement_date
                                  ? formatDate(event.announcement_date)
                                  : "—"}
                              </td>
                              <td>{event.deal_type || "—"}</td>
                              <td>
                                {companyAdvisedRoleRaw || "—"}
                              </td>
                              <td>
                                {companyAdvisedHref
                                  ? createClickableElement(
                                      companyAdvisedHref,
                                      companyAdvisedName,
                                      "advisor-link"
                                    )
                                  : companyAdvisedName}
                              </td>
                              <td>
                                {dedupedSectors.length > 0
                                  ? dedupedSectors.map((s, i) => {
                                      const isPrimary = s.importance
                                        .toLowerCase()
                                        .includes("primary");
                                      const href = isPrimary
                                        ? `/sector/${s.id}`
                                        : `/sub-sector/${s.id}`;
                                      return (
                                        <span
                                          className="nowrap-token"
                                          key={`${s.id}-${i}`}
                                        >
                                          {createClickableElement(
                                            href,
                                            s.name,
                                            "advisor-link"
                                          )}
                                        </span>
                                      );
                                    })
                                  : "—"}
                              </td>
                              <td>{getEnterpriseValue()}</td>
                              <td>
                                {individuals.length > 0
                                  ? individuals
                                      .filter(
                                        (p) =>
                                          p &&
                                          typeof p.id === "number" &&
                                          String(p.name || "").trim().length > 0
                                      )
                                      .map((p, i) => (
                                        <span
                                          className="nowrap-token"
                                          key={`${p.id}-${i}`}
                                        >
                                          {createClickableElement(
                                            `/individual/${p.id}`,
                                            String(p.name),
                                            "advisor-link"
                                          )}
                                        </span>
                                      ))
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="events-cards">
                    {filteredEvents.slice(
                      0,
                      eventsExpanded ? undefined : 10
                    ).map((event, index) => {
                      const companyAdvisedId = event.company_advised_id ?? null;
                      const companyAdvisedName =
                        (event.company_advised_name || "").trim() || "—";
                      const companyAdvisedRoleRaw = String(
                        event.company_advised_role || ""
                      ).trim();
                      const companyAdvisedRole = companyAdvisedRoleRaw.toLowerCase();
                      const companyAdvisedHref =
                        companyAdvisedId && companyAdvisedName !== "—"
                          ? companyAdvisedRole.includes("investor")
                            ? `/investors/${companyAdvisedId}`
                            : `/company/${companyAdvisedId}`
                          : undefined;

                      const getEnterpriseValue = () => {
                        const value = event.enterprise_value_m;
                        const currency = (event.currency_name || "").trim();
                        if (value === null || value === undefined || value === "")
                          return "—";
                        if (currency) return formatCurrency(String(value), currency);
                        const n = Number(String(value).replace(/,/g, ""));
                        return Number.isFinite(n)
                          ? `${Math.round(n).toLocaleString()}M`
                          : String(value);
                      };

                      const individuals = coerceArray<{
                        id?: number;
                        name?: string;
                      }>(event.advisor_individuals)
                        .filter(
                          (p) =>
                            p &&
                            typeof p.id === "number" &&
                            String(p.name || "").trim().length > 0
                        )
                        .map((p) => String(p.name));

                      const sectors = coerceArray<{
                        id?: number;
                        is_derived?: boolean;
                        sector_name?: string;
                        sector_importance?: string;
                      }>(event.primary_sectors)
                        .filter(
                          (s) =>
                            s &&
                            typeof s.id === "number" &&
                            String(s.sector_name || "").trim().length > 0
                        )
                        .map((s) => ({
                          id: s.id as number,
                          name: String(s.sector_name).trim(),
                          importance: String(s.sector_importance || "").trim(),
                          isDerived: Boolean(s.is_derived),
                        }));

                      const dedupedSectors = (() => {
                        const sorted = [...sectors].sort((a, b) => {
                          if (a.isDerived === b.isDerived) return 0;
                          return a.isDerived ? 1 : -1;
                        });
                        const m = new Map<string, (typeof sorted)[number]>();
                        for (const s of sorted) {
                          const key = `${s.id}:${s.importance.toLowerCase()}`;
                          if (!m.has(key)) m.set(key, s);
                        }
                        return Array.from(m.values());
                      })();

                      return (
                        <div key={index} className="event-card">
                          {createClickableElement(
                            `/corporate-event/${event.id}`,
                            event.description || "—",
                            "event-card-title"
                          )}
                          <div className="event-card-info">
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Deal Date:
                              </span>
                              <span className="event-card-info-value">
                                {event.announcement_date
                                  ? formatDate(event.announcement_date)
                                  : "—"}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">Type:</span>
                              <span className="event-card-info-value">
                                {event.deal_type || "—"}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Counterparty Advised:
                              </span>
                              <span className="event-card-info-value">
                                {companyAdvisedRoleRaw || "—"}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Client Name:
                              </span>
                              <span className="event-card-info-value">
                                {companyAdvisedHref
                                  ? createClickableElement(
                                      companyAdvisedHref,
                                      companyAdvisedName,
                                      "advisor-link"
                                    )
                                  : companyAdvisedName}
                              </span>
                            </div>
                            <div
                              className="event-card-info-item"
                              style={{ gridColumn: "1 / -1" }}
                            >
                              <span className="event-card-info-label">
                                Sector(s):
                              </span>
                              <span className="event-card-info-value">
                                {dedupedSectors.length > 0
                                  ? dedupedSectors.map((s, i) => {
                                      const isPrimary = s.importance
                                        .toLowerCase()
                                        .includes("primary");
                                      const href = isPrimary
                                        ? `/sector/${s.id}`
                                        : `/sub-sector/${s.id}`;
                                      return (
                                        <span
                                          className="nowrap-token"
                                          key={`${s.id}-${i}`}
                                        >
                                          {createClickableElement(
                                            href,
                                            s.name,
                                            "advisor-link"
                                          )}
                                        </span>
                                      );
                                    })
                                  : "—"}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">Value:</span>
                              <span className="event-card-info-value">
                                {getEnterpriseValue()}
                              </span>
                            </div>
                            <div
                              className="event-card-info-item"
                              style={{ gridColumn: "1 / -1" }}
                            >
                              <span className="event-card-info-label">
                                Advisor:
                              </span>
                              <span className="event-card-info-value">
                                {individuals.length > 0
                                  ? individuals.join(", ")
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredEvents.length > 10 && (
                    <div className="corporate-events-footer">
                      <button
                        onClick={handleToggleEvents}
                        className="toggle-button toggle-button-primary"
                      >
                        {eventsExpanded ? "Show less" : "See more"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-events">
                  {safeEvents.length > 0
                    ? "No deals match the selected filters."
                    : "No corporate events available"}
                </div>
              )}
            </div>

            {/* Overview / Description / LinkedIn row */}
            <div className="info-sections-row">
            {/* Overview Section */}
            <div className="advisor-section">
              <h2 className="section-title">Overview</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Year founded:</span>
                  <span className="info-value">
                    {getAdvisorYearFoundedDisplay(Advisor)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">HQ:</span>
                  <span className="info-value">{hq || "Not available"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Website:</span>
                  <span className="info-value">
                    {Advisor.url ? (
                      <a
                        href={Advisor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#3b82f6", textDecoration: "none" }}
                      >
                        {Advisor.url}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">
                    Data & Analytics transactions advised:
                  </span>
                  <span className="info-value">
                    {Portfolio_companies_count}
                  </span>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="advisor-section">
              <h2 className="section-title">Description</h2>
              {Advisor.description ? (
                <>
                  <div
                    className={[
                      "info-value",
                      "description-text",
                      descriptionExpanded ? "" : "description-collapsed",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {Advisor.description}
                  </div>
                  <div className="description-footer">
                    <button
                      type="button"
                      className="toggle-button"
                      onClick={() => setDescriptionExpanded((v) => !v)}
                    >
                      {descriptionExpanded ? "Show less" : "Read more"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="info-value">Not available</div>
              )}
            </div>

            {/* Historic LinkedIn Data Section */}
            <div className="advisor-section">
              <h2 className="section-title">Historic LinkedIn Data</h2>
              {linkedInHistoryLoading ? (
                <div className="loading">Loading LinkedIn history...</div>
              ) : linkedInHistory.length > 0 ? (
                <LinkedInHistoryChart data={linkedInHistory} />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: "#6b7280",
                  }}
                >
                  No LinkedIn history data available
                </div>
              )}
            </div>
            </div>{/* end info-sections-row */}

            {/* Advisors Section */}
            <div className="advisor-section">
              <h2 className="section-title">Advisors</h2>

              {/* Current Advisors */}
              <div style={{ marginBottom: "20px" }}>
                <IndividualCards
                  title="Current:"
                  individuals={(() => {
                    // Prefer rolesCurrent from LinkedIn endpoint
                    if (rolesCurrent.length > 0) {
                      return rolesCurrent.map((role) => ({
                        id: role.id,
                        name:
                          role.advisor_individuals ||
                          role.Individual_text ||
                          "Unknown",
                        jobTitles:
                          role.job_titles_id?.map((jt) => jt.job_title) || [],
                        individualId: role.individuals_id,
                      }));
                    }
                    // Fallback to advisorData.Advisors_individuals_current
                    if (
                      advisorData.Advisors_individuals_current &&
                      advisorData.Advisors_individuals_current.length > 0
                    ) {
                      return advisorData.Advisors_individuals_current.map(
                        (individual) => ({
                          id: individual.id,
                          name: individual.advisor_individuals,
                          jobTitles:
                            individual.job_titles_id?.map((jt) => jt.job_title) ||
                            [],
                          individualId: individual.individuals_id,
                        })
                      );
                    }
                    // Final fallback to Advisors_individuals
                    if (Advisors_individuals && Advisors_individuals.length > 0) {
                      return Advisors_individuals.map((individual) => ({
                        id: individual.id,
                        name: individual.advisor_individuals,
                        jobTitles:
                          individual.job_titles_id?.map((jt) => jt.job_title) || [],
                        individualId: individual.individuals_id,
                      }));
                    }
                    return [];
                  })()}
                  emptyMessage="Not available"
                />
              </div>

              {/* Past Advisors - Only show if there are past advisors */}
              {(() => {
                let pastAdvisors: IndividualCardItem[] = [];

                // Prefer rolesPast from LinkedIn endpoint
                if (rolesPast.length > 0) {
                  pastAdvisors = rolesPast.map((role) => ({
                    id: role.id,
                    name:
                      role.advisor_individuals || role.Individual_text || "Unknown",
                    jobTitles: role.job_titles_id?.map((jt) => jt.job_title) || [],
                    individualId: role.individuals_id,
                  }));
                }
                // Fallback to advisorData.Advisors_individuals_past
                else if (
                  advisorData.Advisors_individuals_past &&
                  advisorData.Advisors_individuals_past.length > 0
                ) {
                  pastAdvisors = advisorData.Advisors_individuals_past.map(
                    (individual) => ({
                      id: individual.id,
                      name: individual.advisor_individuals,
                      jobTitles:
                        individual.job_titles_id?.map((jt) => jt.job_title) || [],
                      individualId: individual.individuals_id,
                    })
                  );
                }

                if (pastAdvisors.length > 0) {
                  return (
                    <div>
                      <IndividualCards
                        title="Past:"
                        individuals={pastAdvisors}
                        emptyMessage="Not available"
                      />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
        </div>
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
}
