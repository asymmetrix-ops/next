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
  "Secondary Sector(s)": string;
  Ownership: string;
  "LinkedIn Members": string;
  HQ: string;
  "Company Link"?: string;
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
  Churn?: string;
  GRR?: string;
  NRR?: string;
  "New Clients Revenue Growth"?: string;
}

export class CompaniesCSVExporter {
  static asNumberOrString(value: unknown): number | string | undefined {
    return typeof value === "number" || typeof value === "string"
      ? value
      : undefined;
  }

  static formatLinkedinMembers(members: number | undefined): string {
    if (members === undefined || members === null) return "0";
    return members.toLocaleString();
  }

  static formatSectors(sectors: string[] | undefined): string {
    if (!sectors || sectors.length === 0) return "-";
    return sectors.join(", ");
  }

  /**
   * Format values that represent millions (e.g. revenue_m, ebitda_m).
   * We keep one decimal place and append "M", e.g. 50 -> "50.0M", 2.25 -> "2.3M".
   */
  static formatMillions(
    value: number | string | undefined
  ): string {
    if (value === undefined || value === null || value === "") return "-";
    const num =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[^0-9.-]/g, ""));
    if (!isFinite(num)) return "-";
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
    if (value === undefined || value === null || value === "") return "-";
    const num =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[^0-9.-]/g, ""));
    if (!isFinite(num)) return "-";
    const pct = Math.abs(num) <= 1 ? num * 100 : num;
    const decimals = Math.abs(pct) % 1 === 0 ? 0 : 1;
    return `${pct.toFixed(decimals)}%`;
  }

  /**
   * Fix NRR basis points issue: "10500%" -> "105%", "10300%" -> "103%"
   * Other percentage fields already have correct format, so pass through
   */
  static fixNRR(
    value: number | string | undefined
  ): string {
    if (value === undefined || value === null || value === "") return "-";
    const str = String(value).trim();
    if (str === "-" || str === "") return "-";

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
    if (value === undefined || value === null || value === "") return "-";
    const str = String(value).trim();
    if (str === "-" || str === "") return "-";

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
        Name: company.name || "-",
        Description: company.description || "-",
        "Primary Sector(s)": this.formatSectors(company.primary_sectors),
        "Secondary Sector(s)": this.formatSectors(company.secondary_sectors),
        Ownership: company.ownership || "-",
        "LinkedIn Members": this.formatLinkedinMembers(
          company.linkedin_members
        ),
        HQ: company.country || "-",
        "Company Link": companyLink,
        "Company URL": "",
      };
    });
  }

  static convertToCSV(data: CompanyCSVRow[]): string {
    if (data.length === 0) return "";

    // Get headers from the first object keys
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvBody = [
      // Headers row
      headers.map((header) => `"${header}"`).join(","),
      // Data rows
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof CompanyCSVRow];
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
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
