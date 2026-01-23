"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import IndividualCards, {
  type IndividualCardItem,
} from "@/components/shared/IndividualCards";
import { useAdvisorProfile } from "../../../hooks/useAdvisorProfile";
import {
  formatCurrency,
  formatSectorsList,
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

// Types for LinkedIn History Chart
interface LinkedInHistory {
  date: string;
  employees_count: number;
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
  const router = useRouter();
  const advisorId = parseInt(params.param as string);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [linkedInHistory, setLinkedInHistory] = useState<LinkedInHistory[]>([]);
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { createClickableElement } = useRightClick();

  const { advisorData, corporateEvents, loading, error } = useAdvisorProfile({
    advisorId,
  });

  // Removed: handleAdvisorClick (replaced with createClickableElement in list)

  const handleOtherAdvisorClick = (advisorId: number) => {
    console.log("Other advisor clicked:", advisorId);
    router.push(`/advisor/${advisorId}`);
  };

  // Replaced corporate event navigation with right-clickable links via createClickableElement

  // Removed unused handler; replaced by mailto link button

  const handleToggleEvents = () => {
    setEventsExpanded(!eventsExpanded);
  };

  // Handle PDF export
  const handleExportPdf = useCallback(async () => {
    if (!advisorId || !advisorData) {
      console.error("[PDF Export] Advisor ID or data not available");
      return;
    }

    setIsExportingPdf(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : null;

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const endpoint =
        "https://asymmetrix-pdf-service.fly.dev/api/export-advisor-pdf";

      // Prepare the full data payload
      const payload = {
        advisor_id: advisorId,
        advisor: {
          Advisor: advisorData.Advisor,
          Advised_DA_sectors: advisorData.Advised_DA_sectors || [],
          Portfolio_companies_count: advisorData.Portfolio_companies_count || 0,
          Advisors_individuals: advisorData.Advisors_individuals || [],
          Advisors_individuals_current: advisorData.Advisors_individuals_current || [],
          Advisors_individuals_past: advisorData.Advisors_individuals_past || [],
        },
        corporate_events: corporateEvents || [],
        linkedin_history: linkedInHistory || [],
        management_roles: {
          current: rolesCurrent || [],
          past: rolesPast || [],
        },
        xano_auth_token: token,
      };

      console.log("[PDF Export] POST", endpoint, {
        advisor_id: advisorId,
        advisor_name: advisorData.Advisor?.name,
        events_count: (corporateEvents || []).length,
        linkedin_history_count: linkedInHistory.length,
        current_roles_count: rolesCurrent.length,
        past_roles_count: rolesPast.length,
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`PDF export failed: ${res.status} ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const advisorName = (advisorData.Advisor?.name || "Advisor")
        .toString()
        .replace(/[\\/:*?"<>|]/g, " ")
        .slice(0, 180);
      a.download = `Asymmetrix ${advisorName} Advisor profile.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (error) {
      console.error("[PDF Export] Error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to export PDF. Please try again later."
      );
    } finally {
      setIsExportingPdf(false);
    }
  }, [
    advisorId,
    advisorData,
    corporateEvents,
    linkedInHistory,
    rolesCurrent,
    rolesPast,
  ]);

  // Fetch LinkedIn history data using the same API pattern as company page
  const fetchLinkedInHistory = useCallback(async () => {
    setLinkedInHistoryLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${advisorId}`,
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
    Advised_DA_sectors,
    Portfolio_companies_count,
    Advisors_individuals,
  } = advisorData;

  // Map various backend role shapes into the `IndividualCards` format (same as Company -> Management UI)
  const toIndividualCardItems = (items: Array<unknown>): IndividualCardItem[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = items as any[];
    if (!Array.isArray(list)) return [];
    return list
      .map((raw) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = raw as any;
        const name =
          String(r?.advisor_individuals || r?.Individual_text || "").trim() ||
          "Unknown";
        const individualId =
          typeof r?.individuals_id === "number"
            ? r.individuals_id
            : parseInt(String(r?.individuals_id ?? ""), 10);
        const safeIndividualId = Number.isFinite(individualId)
          ? individualId
          : undefined;
        const jobTitles = Array.isArray(r?.job_titles_id)
          ? (r.job_titles_id as Array<{ job_title?: unknown }>)
              .map((jt) => String(jt?.job_title ?? "").trim())
              .filter(Boolean)
          : [];
        return {
          id: typeof r?.id === "number" ? r.id : undefined,
          name,
          jobTitles,
          individualId: safeIndividualId,
        } satisfies IndividualCardItem;
      })
      .filter((p) => Boolean(p.name));
  };

  const advisorsCurrentCards: IndividualCardItem[] =
    rolesCurrent.length > 0
      ? toIndividualCardItems(rolesCurrent)
      : advisorData.Advisors_individuals_current &&
          advisorData.Advisors_individuals_current.length > 0
        ? toIndividualCardItems(advisorData.Advisors_individuals_current)
        : Advisors_individuals && Advisors_individuals.length > 0
          ? toIndividualCardItems(Advisors_individuals)
          : [];

  const advisorsPastCards: IndividualCardItem[] =
    rolesPast.length > 0
      ? toIndividualCardItems(rolesPast)
      : advisorData.Advisors_individuals_past &&
          advisorData.Advisors_individuals_past.length > 0
        ? toIndividualCardItems(advisorData.Advisors_individuals_past)
        : [];

  // Corporate Events (new advisors_ce payload) helpers
  const safeEvents = Array.isArray(corporateEvents) ? corporateEvents : [];

  const parseJsonArray = <T,>(raw?: string | null): T[] => {
    if (!raw) return [];
    const trimmed = String(raw).trim();
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

  const hq = `${Advisor._locations?.City || ""}, ${
    Advisor._locations?.State__Province__County || ""
  }, ${Advisor._locations?.Country || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

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
      background-color: #dc2626;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      text-decoration: none;
      display: inline-block;
    }
    .export-pdf-button {
      padding: 8px 16px;
      background-color: #0075df;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .export-pdf-button:hover:not(:disabled) {
      background-color: #005bb5;
    }
    .export-pdf-button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    .advisor-layout {
      display: grid;
      /* Give Corporate Events more room (it has many columns) */
      grid-template-columns: minmax(320px, 1fr) minmax(0, 3fr);
      gap: 24px 32px;
      align-items: start;
    }
    .advisor-left-column { width: 100%; }
    .advisor-right-column { width: 100%; }
    .advisor-section {
      background-color: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }
    .section-title {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: bold;
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
    }
    .info-value {
      color: #6b7280;
    }
    .corporate-events-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .toggle-button {
      color: #3b82f6;
      text-decoration: none;
      font-size: 14px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    .events-table-container {
      overflow-x: auto;
    }
    .events-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      /* Prevent columns from becoming overly narrow; allow horizontal scroll */
      min-width: 1250px;
    }
    .events-table thead tr {
      border-bottom: 2px solid #e2e8f0;
    }
    .events-table th {
      text-align: left;
      padding: 8px;
      font-weight: bold;
      font-size: 12px;
    }
    .events-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }
    .events-table td {
      padding: 8px;
      font-size: 12px;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-break: anywhere;
    }
    .events-table td:nth-child(2) {
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: nowrap;
    }
    .nowrap-token { display: inline-block; white-space: nowrap; }
    .nowrap-token:not(:last-child)::after { content: ", "; }
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
      color: #3b82f6;
      text-decoration: none;
      cursor: pointer;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-break: anywhere;
    }
    .event-link:hover {
      text-decoration: underline;
    }
    .advisor-link {
      color: #3b82f6;
      text-decoration: none;
      cursor: pointer;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-break: anywhere;
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
    }
    .event-card-info-value {
      color: #6b7280;
      font-size: 12px;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-break: anywhere;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    /* Advisors (match Company -> Management cards) */
    .management-card:hover {
      background-color: #e6f0ff !important;
      border-color: #0075df !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 117, 223, 0.1);
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
      .advisor-header > div:last-child {
        flex-direction: column !important;
        align-items: stretch !important;
        width: 100% !important;
      }
      .export-pdf-button,
      .report-button {
        align-self: flex-start !important;
        width: fit-content !important;
        margin-bottom: 8px !important;
      }
      .export-pdf-button:last-child,
      .report-button:last-child {
        margin-bottom: 0 !important;
      }
      .advisor-layout {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
      }
      .advisor-left-column,
      .advisor-right-column {
        width: 100% !important;
      }
      .advisor-section {
        padding: 16px !important;
        margin-bottom: 16px !important;
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

      .management-grid {
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
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || !advisorData}
              className="export-pdf-button"
              style={{
                padding: "8px 16px",
                backgroundColor: isExportingPdf ? "#9ca3af" : "#0075df",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  isExportingPdf || !advisorData ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
                transition: "background-color 0.2s",
              }}
            >
              {isExportingPdf ? "Exporting..." : "Export PDF"}
            </button>
            <a
              className="report-button"
              href={`mailto:a.boden@asymmetrixintelligence.com?subject=${encodeURIComponent(
                `Report Incorrect Advisor Data – ${Advisor.name} (ID ${Advisor.id})`
              )}&body=${encodeURIComponent(
                "Please describe the issue you found for this advisor page."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Report Incorrect Data
            </a>
          </div>
        </div>

        <div className="advisor-layout">
          {/* Left Column - Overview */}
          <div className="advisor-left-column">
            {/* Overview Section */}
            <div className="advisor-section">
              <h2 className="section-title">Overview</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Advised D&A sectors:</span>
                  <span className="info-value">
                    {formatSectorsList(Advised_DA_sectors) || "Not available"}
                  </span>
                </div>
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
              <div className="info-value" style={{ whiteSpace: "pre-wrap" }}>
                {Advisor.description || "Not available"}
              </div>
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
          </div>

          {/* Right Column - Corporate Events */}
          <div className="advisor-right-column">
            <div className="advisor-section">
              <div className="corporate-events-header">
                <h2 className="section-title">Corporate Events</h2>
                {safeEvents.length > 10 && (
                    <button
                      onClick={handleToggleEvents}
                      className="toggle-button"
                    >
                      {eventsExpanded ? "Show less" : "See more"}
                    </button>
                  )}
              </div>

              {safeEvents.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="events-table-container">
                    <table className="events-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Date Announced</th>
                          <th>Type</th>
                          <th>Company Advised</th>
                          <th>Enterprise Value</th>
                          <th>Individuals</th>
                          <th>Other Advisors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safeEvents.slice(
                          0,
                          eventsExpanded ? undefined : 10
                        ).map((event, index) => {
                          // Company Advised comes directly from the new endpoint
                          const companyAdvisedId = event.company_advised_id ?? null;
                          const companyAdvisedName =
                            (event.company_advised_name || "").trim() || "—";
                          const companyAdvisedRole = (
                            event.company_advised_role || ""
                          ).toLowerCase();
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

                          const individuals = parseJsonArray<{
                            id?: number;
                            name?: string;
                          }>(event.advisor_individuals);

                          const otherAdvisors = parseJsonArray<{
                            advisor_company_id?: number;
                            advisor_company_name?: string;
                          }>(event.other_advisors).filter(
                            (a) => a && a.advisor_company_id && a.advisor_company_name
                          );

                          return (
                            <tr key={index}>
                              <td>
                                {createClickableElement(
                                  `/corporate-event/${event.id}`,
                                  event.description,
                                  "event-link"
                                )}
                              </td>
                              <td>{formatDate(event.announcement_date)}</td>
                              <td>{event.deal_type || "—"}</td>
                              <td>
                                {companyAdvisedHref
                                  ? createClickableElement(
                                      companyAdvisedHref,
                                      companyAdvisedName,
                                      "advisor-link"
                                    )
                                  : companyAdvisedName}
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
                              <td>
                                {otherAdvisors.length > 0
                                  ? otherAdvisors.map((advisor, i) => (
                                      <span
                                        className="nowrap-token"
                                        key={`${advisor.advisor_company_id}-${i}`}
                                      >
                                        <span
                                          onClick={() =>
                                            handleOtherAdvisorClick(
                                              advisor.advisor_company_id as number
                                            )
                                          }
                                          className="advisor-link"
                                        >
                                          {advisor.advisor_company_name}
                                        </span>
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
                    {safeEvents.slice(
                      0,
                      eventsExpanded ? undefined : 10
                    ).map((event, index) => {
                      const companyAdvisedId = event.company_advised_id ?? null;
                      const companyAdvisedName =
                        (event.company_advised_name || "").trim() || "—";
                      const companyAdvisedRole = (
                        event.company_advised_role || ""
                      ).toLowerCase();
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

                      const individuals = parseJsonArray<{
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

                      const otherAdvisors = parseJsonArray<{
                        advisor_company_id?: number;
                        advisor_company_name?: string;
                      }>(event.other_advisors)
                        .filter(
                          (a) =>
                            a &&
                            typeof a.advisor_company_id === "number" &&
                            String(a.advisor_company_name || "").trim().length > 0
                        )
                        .map((a) => ({
                          id: a.advisor_company_id as number,
                          name: String(a.advisor_company_name),
                        }));

                      return (
                        <div key={index} className="event-card">
                          {createClickableElement(
                            `/corporate-event/${event.id}`,
                            event.description,
                            "event-card-title"
                          )}
                          <div className="event-card-info">
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Date:
                              </span>
                              <span className="event-card-info-value">
                                {formatDate(event.announcement_date)}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Type:
                              </span>
                              <span className="event-card-info-value">
                                {event.deal_type || "—"}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Company Advised:
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
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Value:
                              </span>
                              <span className="event-card-info-value">
                                {getEnterpriseValue()}
                              </span>
                            </div>
                            <div
                              className="event-card-info-item"
                              style={{ gridColumn: "1 / -1" }}
                            >
                              <span className="event-card-info-label">
                                Individuals:
                              </span>
                              <span className="event-card-info-value">
                                {individuals.length > 0
                                  ? individuals.join(", ")
                                  : "—"}
                              </span>
                            </div>
                            <div
                              className="event-card-info-item"
                              style={{ gridColumn: "1 / -1" }}
                            >
                              <span className="event-card-info-label">
                                Other Advisors:
                              </span>
                              <span className="event-card-info-value">
                                {otherAdvisors.length > 0
                                  ? otherAdvisors.map((a) => (
                                      <span
                                        className="nowrap-token"
                                        key={a.id}
                                      >
                                        <span
                                          onClick={() =>
                                            handleOtherAdvisorClick(a.id)
                                          }
                                          className="advisor-link"
                                        >
                                          {a.name}
                                        </span>
                                      </span>
                                    ))
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="no-events">No corporate events available</div>
              )}
            </div>

            {/* Advisors (moved under Corporate Events; match Company -> Management layout) */}
            <div className="advisor-section">
              <h2 className="section-title">Advisors</h2>

              <div style={{ marginBottom: "20px" }}>
                <IndividualCards
                  title="Current:"
                  individuals={advisorsCurrentCards}
                  emptyMessage="Not available"
                />
              </div>

              <div>
                <IndividualCards
                  title="Past:"
                  individuals={advisorsPastCards}
                  emptyMessage="Not available"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
}
