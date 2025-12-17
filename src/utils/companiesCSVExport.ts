// Types for companies data
interface Company {
  id: number;
  name: string;
  description: string;
  primary_sectors: string[];
  secondary_sectors: string[];
  ownership_type_id: number;
  ownership: string;
  country: string;
  linkedin_logo: string;
  linkedin_members_latest: number;
  linkedin_members_old: number;
  linkedin_members: number;
}

export interface CompanyCSVRow {
  Name: string;
  Description: string;
  "Primary Sector(s)": string;
  Sectors: string;
  Ownership: string;
  "LinkedIn Members": string;
  Country: string;
  "Company URL": string;
  // Optional Financial Metrics
  Revenue?: string;
  EBITDA?: string;
  "Enterprise Value"?: string;
  "Revenue Multiple"?: string;
  "Revenue Growth"?: string;
  "EBITDA Margin"?: string;
  "Rule of 40"?: string;
  // Optional Subscription Metrics
  "Recurring Revenue"?: string;
  ARR?: string;
  Churn?: string;
  GRR?: string;
  NRR?: string;
  "New Clients Revenue Growth"?: string;
}

export class CompaniesCSVExporter {
  static formatLinkedinMembers(members: number | undefined): string {
    if (members === undefined || members === null) return "0";
    return members.toLocaleString();
  }

  static formatSectors(sectors: string[] | undefined): string {
    if (!sectors || sectors.length === 0) return "N/A";
    return sectors.join(", ");
  }

  /**
   * Format values that represent millions (e.g. revenue_m, ebitda_m, arr_m).
   * We keep one decimal place and append "M", e.g. 50 -> "50.0M", 2.25 -> "2.3M".
   */
  static formatMillions(
    value: number | string | undefined
  ): string {
    if (value === undefined || value === null || value === "") return "N/A";
    const num =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[^0-9.-]/g, ""));
    if (!isFinite(num)) return "N/A";
    return `${num.toFixed(1)}M`;
  }

  /**
   * Format percentage-like values (e.g. *_pc, nrr, rule_of_40).
   * If the magnitude is <= 1 we treat it as a fraction (0.27 -> 27%),
   * otherwise we treat it as already in percent units (27 -> 27%).
   */
  static formatPercent(
    value: number | string | undefined
  ): string {
    if (value === undefined || value === null || value === "") return "N/A";
    const num =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[^0-9.-]/g, ""));
    if (!isFinite(num)) return "N/A";
    const pct = Math.abs(num) <= 1 ? num * 100 : num;
    const decimals = Math.abs(pct) % 1 === 0 ? 0 : 1;
    return `${pct.toFixed(decimals)}%`;
  }

  /**
   * Clean ARR values that come as "8 EURM", "8.5 GBPM" etc.
   * Returns just the numeric part with M: "8.0M", "8.5M"
   */
  static cleanARR(
    value: number | string | undefined
  ): string {
    if (value === undefined || value === null || value === "") return "N/A";
    const str = String(value).trim();
    if (str === "N/A" || str === "") return "N/A";
    
    // Extract just the numeric part from "8 EURM" or "8.5 GBPM"
    // Match the number (with optional decimal) before any text
    const match = str.match(/^([\d.]+)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) {
        return `${num.toFixed(1)}M`;
      }
    }
    
    return "N/A";
  }
  
  /**
   * Fix NRR basis points issue: "10500%" -> "105%", "10300%" -> "103%"
   * Other percentage fields already have correct format, so pass through
   */
  static fixNRR(
    value: number | string | undefined
  ): string {
    if (value === undefined || value === null || value === "") return "N/A";
    const str = String(value).trim();
    if (str === "N/A" || str === "") return "N/A";
    
    // If it has %, extract the number
    if (str.includes("%")) {
      const num = Number(str.replace(/[^0-9.-]/g, ""));
      if (!isNaN(num) && Math.abs(num) > 1000) {
        // Divide by 100 and add % back
        const normalized = num / 100;
        const decimals = Math.abs(normalized) % 1 === 0 ? 0 : 1;
        return `${normalized.toFixed(decimals)}%`;
      }
    }
    
    // Return as-is (already formatted correctly)
    return str;
  }
  
  /**
   * Format Rule of 40 which comes as a plain number without %
   */
  static formatRuleOf40(
    value: number | string | undefined
  ): string {
    if (value === undefined || value === null || value === "") return "N/A";
    const str = String(value).trim();
    if (str === "N/A" || str === "") return "N/A";
    
    // If it already has %, return as-is
    if (str.includes("%")) return str;
    
    // Otherwise add %
    return `${str}%`;
  }

  static convertToCSVData(companies: Company[]): CompanyCSVRow[] {
    return companies.map((company) => {
      // Generate the company link
      const companyLink =
        typeof window !== "undefined"
          ? `${window.location.origin}/company/${company.id}`
          : `/company/${company.id}`;

      return {
        Name: company.name || "N/A",
        Description: company.description || "N/A",
        "Primary Sector(s)": this.formatSectors(company.primary_sectors),
        Sectors: this.formatSectors(company.secondary_sectors),
        Ownership: company.ownership || "N/A",
        "LinkedIn Members": this.formatLinkedinMembers(
          company.linkedin_members
        ),
        Country: company.country || "N/A",
        "Company URL": companyLink,
      };
    });
  }

  static convertToCSV(data: CompanyCSVRow[]): string {
    if (data.length === 0) return "";

    // Define all possible headers in order to ensure all columns are included
    const allHeaders: (keyof CompanyCSVRow)[] = [
      "Name",
      "Description",
      "Primary Sector(s)",
      "Sectors",
      "Ownership",
      "LinkedIn Members",
      "Country",
      "Company URL",
      // Financial Metrics
      "Revenue",
      "EBITDA",
      "Enterprise Value",
      "Revenue Multiple",
      "Revenue Growth",
      "EBITDA Margin",
      "Rule of 40",
      // Subscription Metrics
      "Recurring Revenue",
      "ARR",
      "Churn",
      "GRR",
      "NRR",
      "New Clients Revenue Growth",
    ];

    // Create CSV content
    const csvBody = [
      // Headers row
      allHeaders.map((header) => `"${header}"`).join(","),
      // Data rows
      ...data.map((row) =>
        allHeaders
          .map((header) => {
            const value = row[header];
            // Escape quotes and wrap in quotes, default to empty string if undefined
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\r\n");

    // Prepend UTF-8 BOM to help Excel/Sheets parse correctly
    const BOM = "\uFEFF";
    return BOM + csvBody;
  }

  static downloadCSV(csvContent: string, filename: string = "companies"): void {
    // Add timestamp to filename
    const timestamp = new Date().toISOString().split("T")[0];
    const fullFilename = `${filename}_${timestamp}.csv`;

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fullFilename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  static exportCompanies(companies: Company[], filename?: string): void {
    const csvData = this.convertToCSVData(companies);
    const csvContent = this.convertToCSV(csvData);
    this.downloadCSV(csvContent, filename);
  }
}
