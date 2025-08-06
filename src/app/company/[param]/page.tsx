"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Types for API integration
interface CompanyLocation {
  City: string;
  State__Province__County: string;
  Country: string;
}

interface CompanySector {
  Sector_importance: string;
  sector_name: string;
  sector_id: number;
}

interface CompanyRevenue {
  revenues_m: string;
  rev_source: string;
  years_id: number;
  revenues_currency: string;
}

interface CompanyEBITDA {
  EBITDA_m: string;
}

interface CompanyEV {
  ev_value: string;
}

interface CompanyLinkedInData {
  linkedin_logo: string;
  LinkedIn_URL: string;
}

interface CompanyOwnershipType {
  ownership: string;
}

interface LifecycleStage {
  Lifecycle_Stage: string;
}

interface EmployeeCount {
  date: string;
  employees_count: number;
}

interface Company {
  id: number;
  name: string;
  description: string;
  year_founded: number;
  url: string;
  _linkedin_data_of_new_company: CompanyLinkedInData;
  _locations: CompanyLocation;
  _ownership_type: CompanyOwnershipType;
  sectors_id: CompanySector[];
  revenues: CompanyRevenue;
  EBITDA: CompanyEBITDA;
  ev_data: CompanyEV;
  _companies_employees_count_monthly: EmployeeCount[];
  Lifecycle_stage: LifecycleStage;
}

interface CompanyResponse {
  Company: Company;
}

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

const formatDate = (dateString: string): string => {
  const [year, month] = dateString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

const validateFinancialData = (value: string): string => {
  if (!value || value === "nan" || value === "null") return "Not available";
  return value;
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  const logoStyle = {
    objectFit: "contain" as const,
    borderRadius: "8px",
  };

  const placeholderStyle = {
    width: "80px",
    height: "60px",
    backgroundColor: "#f7fafc",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    color: "#718096",
  };

  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={80}
        height={60}
        className="company-logo"
        style={logoStyle}
      />
    );
  }

  return <div style={placeholderStyle}>No Logo</div>;
};

// Employee Chart Component
const EmployeeChart = ({ data }: { data: EmployeeCount[] }) => {
  const chartData = data.map((item) => ({
    date: formatDate(item.date),
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
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <p style={{ margin: 0 }}>{`Date: ${label}`}</p>
          <p style={{ margin: 0, color: "#0075df" }}>
            {`Employees: ${payload[0].value.toLocaleString()}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "300px",
        minHeight: "250px",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0075df"
            strokeWidth={2}
            dot={{
              fill: "#0075df",
              strokeWidth: 2,
              r: 4,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main Company Detail Component
const CompanyDetail = () => {
  const params = useParams();
  const companyId = params.param as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("asymmetrix_auth_token");

        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${companyId}`,
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
          if (response.status === 404) {
            throw new Error("Company not found");
          }
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data: CompanyResponse = await response.json();

        if (!data.Company) {
          throw new Error("Invalid company data");
        }

        setCompany(data.Company);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch company data"
        );
        console.error("Error fetching company data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666" }}>
            Loading company data...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#e53e3e" }}>
            {error === "Company not found" ? (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Company Not Found
                </h1>
                <p style={{ marginBottom: "24px" }}>
                  The company you&apos;re looking for doesn&apos;t exist or has
                  been removed.
                </p>
                <a
                  href="/companies"
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Companies
                </a>
              </div>
            ) : (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Error Loading Company
                </h1>
                <p style={{ marginBottom: "24px" }}>{error}</p>
                <a
                  href="/companies"
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Companies
                </a>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!company) {
    return null;
  }

  // Process sectors
  const primarySectors =
    company.sectors_id?.filter(
      (sector) => sector.Sector_importance === "Primary"
    ) || [];
  const secondarySectors =
    company.sectors_id?.filter(
      (sector) => sector.Sector_importance !== "Primary"
    ) || [];

  // Process location
  const location = company._locations;
  const fullAddress = [
    location?.City,
    location?.State__Province__County,
    location?.Country,
  ]
    .filter(Boolean)
    .join(", ");

  // Process financial data
  const revenue = validateFinancialData(company.revenues?.revenues_m);
  const ebitda = validateFinancialData(company.EBITDA?.EBITDA_m);
  const enterpriseValue = validateFinancialData(company.ev_data?.ev_value);

  // Process employee data
  const employeeData = company._companies_employees_count_monthly || [];
  const currentEmployeeCount =
    employeeData.length > 0
      ? employeeData[employeeData.length - 1].employees_count
      : 0;

  const styles = {
    container: {
      backgroundColor: "#f9fafb",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    },
    maxWidth: {
      width: "100%",
      padding: "32px",
      flex: "1",
      display: "flex",
      flexDirection: "column" as const,
    },
    header: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "32px 24px",
      marginBottom: "24px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap" as const,
      gap: "16px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    companyName: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#1a202c",
      margin: "0",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    scoreBadge: {
      backgroundColor: "#f7fafc",
      color: "#4a5568",
      padding: "8px 16px",
      borderRadius: "20px",
      fontSize: "14px",
      fontWeight: "500",
    },
    reportButton: {
      backgroundColor: "#e53e3e",
      color: "white",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      textDecoration: "none",
    },
    mainContent: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
      marginBottom: "24px",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "32px 24px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    sectionTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1a202c",
      marginBottom: "24px",
      marginTop: "0",
    },
    infoRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "12px 0",
      borderBottom: "1px solid #e2e8f0",
    },
    infoRowLast: {
      borderBottom: "none",
    },
    label: {
      fontSize: "14px",
      color: "#4a5568",
      fontWeight: "500",
      minWidth: "120px",
    },
    value: {
      fontSize: "14px",
      color: "#1a202c",
      fontWeight: "400",
      textAlign: "right" as const,
      flex: "1",
      marginLeft: "16px",
    },
    link: {
      color: "#0075df",
      textDecoration: "underline",
      cursor: "pointer",
    },
    description: {
      fontSize: "14px",
      color: "#1a202c",
      lineHeight: "1.6",
      marginTop: "16px",
    },
    chartContainer: {
      marginTop: "24px",
      overflow: "hidden",
    },
    chartTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#1a202c",
      marginBottom: "16px",
    },
    currentCount: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#0075df",
      marginBottom: "16px",
    },
    linkedinLink: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#0075df",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: "500",
    },
    responsiveGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
      flex: "1",
    },
    "@media (max-width: 768px)": {
      responsiveGrid: {
        gridTemplateColumns: "1fr",
        gap: "16px",
      },
      header: {
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "20px 16px",
        gap: "12px",
      },
      headerLeft: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "12px",
        width: "100%",
      },
      headerRight: {
        alignSelf: "stretch",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
      },
      maxWidth: {
        padding: "16px",
      },
      card: {
        padding: "20px 16px",
      },
      companyName: {
        fontSize: "22px",
        lineHeight: "1.3",
      },
      sectionTitle: {
        fontSize: "18px",
        marginBottom: "20px",
      },
      infoRow: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "4px",
        padding: "16px 0",
      },
      label: {
        fontSize: "13px",
        color: "#718096",
        fontWeight: "600",
        minWidth: "auto",
        marginBottom: "4px",
      },
      value: {
        fontSize: "14px",
        textAlign: "left",
        marginLeft: "0",
        lineHeight: "1.4",
        wordBreak: "break-word",
      },
      description: {
        fontSize: "14px",
        lineHeight: "1.5",
        marginTop: "12px",
      },
      chartTitle: {
        fontSize: "15px",
        marginBottom: "12px",
      },
      currentCount: {
        fontSize: "20px",
        marginBottom: "12px",
      },

      scoreBadge: {
        fontSize: "12px",
        padding: "6px 12px",
      },
      reportButton: {
        fontSize: "12px",
        padding: "6px 12px",
      },
      linkedinLink: {
        fontSize: "13px",
        justifyContent: "center",
        padding: "12px",
        backgroundColor: "#f7fafc",
        borderRadius: "8px",
        width: "100%",
      },
      // Hide chart in desktop financial metrics on mobile
      chartContainer: {
        marginTop: "20px",
        overflow: "hidden",
        padding: "0 8px",
        width: "100%",
        display: "none", // Hide on mobile by default
      },
      // Show mobile chart section on mobile
      mobileChartSection: {
        display: "block",
      },
    },
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "min-h-screen", style: styles.container },
      React.createElement(
        Head,
        null,
        [
          React.createElement(
            "title",
            { key: "title" },
            `${company.name} - Company Profile | Asymmetrix`
          ),
          React.createElement("meta", {
            key: "description",
            name: "description",
            content:
              company.description ||
              `Learn more about ${
                company.name
              }, a company in the ${primarySectors
                .map((s) => s.sector_name)
                .join(", ")} sector.`,
          }),
          React.createElement("meta", {
            key: "og:title",
            property: "og:title",
            content: `${company.name} - Company Profile`,
          }),
          React.createElement("meta", {
            key: "og:description",
            property: "og:description",
            content: company.description || `Learn more about ${company.name}`,
          }),
          company._linkedin_data_of_new_company?.linkedin_logo &&
            React.createElement("meta", {
              key: "og:image",
              property: "og:image",
              content: `data:image/jpeg;base64,${company._linkedin_data_of_new_company.linkedin_logo}`,
            }),
        ].filter(Boolean)
      ),
      React.createElement(Header),
      React.createElement(
        "div",
        { style: styles.maxWidth },
        React.createElement(
          "div",
          { style: styles.header },
          React.createElement(
            "div",
            { style: styles.headerLeft },
            React.createElement(CompanyLogo, {
              logo: company._linkedin_data_of_new_company?.linkedin_logo,
              name: company.name,
            }),
            React.createElement(
              "h1",
              { style: styles.companyName },
              company.name
            )
          ),
          React.createElement(
            "div",
            { style: styles.headerRight },
            React.createElement(
              "div",
              { style: styles.scoreBadge },
              "Asymmetrix Score: Coming Soon"
            ),
            React.createElement(
              "button",
              { style: styles.reportButton },
              "Report Incorrect Data"
            )
          )
        ),
        React.createElement(
          "div",
          { style: styles.responsiveGrid, className: "responsiveGrid" },
          React.createElement(
            "div",
            { style: styles.card, className: "card" },
            React.createElement(
              "h2",
              { style: styles.sectionTitle },
              "Overview"
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Primary Sector:"
              ),
              React.createElement(
                "div",
                { style: styles.value },
                primarySectors.length > 0
                  ? primarySectors.map((sector, index) =>
                      React.createElement("span", { key: sector.sector_id }, [
                        React.createElement(
                          "span",
                          { key: "link", style: styles.link },
                          sector.sector_name
                        ),
                        index < primarySectors.length - 1 && ", ",
                      ])
                    )
                  : "Not available"
              )
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Secondary Sector(s):"
              ),
              React.createElement(
                "div",
                { style: styles.value },
                secondarySectors.length > 0
                  ? secondarySectors.map((sector, index) =>
                      React.createElement("span", { key: sector.sector_id }, [
                        React.createElement(
                          "span",
                          { key: "link", style: styles.link },
                          sector.sector_name
                        ),
                        index < secondarySectors.length - 1 && ", ",
                      ])
                    )
                  : "Not available"
              )
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Year Founded:"
              ),
              React.createElement(
                "span",
                { style: styles.value },
                company.year_founded && company.year_founded > 0
                  ? company.year_founded
                  : "Not available"
              )
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement("span", { style: styles.label }, "Website:"),
              React.createElement(
                "span",
                { style: styles.value },
                company.url
                  ? React.createElement(
                      "a",
                      {
                        href: company.url,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        style: styles.link,
                      },
                      company.url
                    )
                  : "Not available"
              )
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Ownership:"
              ),
              React.createElement(
                "span",
                { style: styles.value },
                company._ownership_type?.ownership || "Not available"
              )
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement("span", { style: styles.label }, "HQ:"),
              React.createElement(
                "span",
                { style: styles.value },
                fullAddress || "Not available"
              )
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Lifecycle stage:"
              ),
              React.createElement(
                "span",
                { style: styles.value },
                company.Lifecycle_stage?.Lifecycle_Stage || "Not available"
              )
            ),
            React.createElement(
              "div",
              { style: styles.infoRowLast },
              React.createElement(
                "span",
                { style: styles.label },
                "Description:"
              )
            ),
            React.createElement(
              "div",
              { style: styles.description },
              company.description || "No description available"
            )
          ),
          // Desktop Financial Metrics (stays in grid for desktop)
          React.createElement(
            "div",
            { style: styles.card, className: "card desktop-financial-metrics" },
            React.createElement(
              "h2",
              { style: styles.sectionTitle },
              "Financial Metrics"
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Revenue (m):"
              ),
              React.createElement("span", { style: styles.value }, revenue)
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "EBITDA (m):"
              ),
              React.createElement("span", { style: styles.value }, ebitda)
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Enterprise Value:"
              ),
              React.createElement(
                "span",
                { style: styles.value },
                enterpriseValue
              )
            ),
            React.createElement(
              "div",
              { style: styles.chartContainer, className: "chartContainer" },
              React.createElement(
                "div",
                { style: styles.chartTitle },
                "LinkedIn Employee Count"
              ),
              React.createElement(
                "div",
                { style: styles.currentCount },
                `${formatNumber(currentEmployeeCount)} employees`
              ),
              employeeData.length > 0
                ? React.createElement(EmployeeChart, { data: employeeData })
                : React.createElement(
                    "div",
                    {
                      style: {
                        textAlign: "center",
                        padding: "40px",
                        color: "#666",
                        fontSize: "14px",
                      },
                    },
                    "No employee data available"
                  )
            )
          )
        ),
        // Mobile Financial Metrics (shown on mobile)
        React.createElement(
          "div",
          {
            style: { display: "none", marginTop: "8px" },
            className: "mobile-financial-metrics",
          },
          React.createElement(
            "div",
            {
              style: {
                ...styles.card,
                width: "100%",
                padding: "20px 16px", // Ensure consistent mobile padding
              },
            },
            React.createElement(
              "h2",
              { style: styles.sectionTitle },
              "Financial Metrics"
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Revenue (m):"
              ),
              React.createElement("span", { style: styles.value }, revenue)
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "EBITDA (m):"
              ),
              React.createElement("span", { style: styles.value }, ebitda)
            ),
            React.createElement(
              "div",
              { style: styles.infoRow },
              React.createElement(
                "span",
                { style: styles.label },
                "Enterprise Value:"
              ),
              React.createElement(
                "span",
                { style: styles.value },
                enterpriseValue
              )
            ),
            React.createElement(
              "div",
              { style: styles.chartContainer },
              React.createElement(
                "div",
                { style: styles.chartTitle },
                "LinkedIn Employee Count"
              ),
              React.createElement(
                "div",
                { style: styles.currentCount },
                `${formatNumber(currentEmployeeCount)} employees`
              ),
              employeeData.length > 0
                ? React.createElement(EmployeeChart, { data: employeeData })
                : React.createElement(
                    "div",
                    {
                      style: {
                        textAlign: "center",
                        padding: "40px",
                        color: "#666",
                        fontSize: "14px",
                      },
                    },
                    "No employee data available"
                  )
            )
          )
        ),
        // LinkedIn section (desktop only) - only render if LinkedIn URL exists
        company._linkedin_data_of_new_company?.LinkedIn_URL &&
          React.createElement(
            "div",
            { style: styles.card, className: "desktop-linkedin-section" },
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "center" } },
              React.createElement(
                "a",
                {
                  href: company._linkedin_data_of_new_company.LinkedIn_URL,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: styles.linkedinLink,
                },
                [
                  React.createElement(
                    "svg",
                    {
                      key: "svg",
                      width: "20",
                      height: "20",
                      viewBox: "0 0 24 24",
                      fill: "currentColor",
                    },
                    React.createElement("path", {
                      d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
                    })
                  ),
                  "View on LinkedIn",
                ]
              )
            )
          )
      ),
      React.createElement(Footer)
    ),
    React.createElement(
      "style",
      { jsx: true },
      `
         @media (max-width: 768px) {
           .mobile-financial-metrics {
             display: block !important;
           }
           .desktop-financial-metrics {
             display: none !important;
           }
           .desktop-linkedin-section {
             display: none !important;
           }
         }
         @media (min-width: 769px) {
           .mobile-financial-metrics {
             display: none !important;
           }
           .desktop-financial-metrics {
             display: block !important;
           }
           .desktop-linkedin-section {
             display: block !important;
           }
         }
             `
    )
  );
};

export default CompanyDetail;
