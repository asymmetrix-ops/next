import { CorporateEvent } from "@/types/corporateEvents";

export interface CorporateEventCSVRow {
  Description: string;
  Date: string;
  "Target Name": string;
  "Target HQ": string;
  "Primary Sector": string;
  "Secondary Sectors": string;
  "Investment Type": string;
  "Amount (m)": string;
  "EV (m)": string;
  "Buyer(s)/Investor(s)": string;
  "Seller(s)": string;
  Advisors: string;
  "Corporate Event Link": string;
}

export class CSVExporter {
  static formatDate(dateString: string): string {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  }

  static formatCurrency(
    amount: string | undefined,
    currency: string | undefined
  ): string {
    if (!amount || !currency) return "Not available";
    const n = Number(amount);
    if (Number.isNaN(n)) return "Not available";
    return `${currency}${n.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })}m`;
  }

  static formatSectors(sectors: { sector_name: string }[] | undefined): string {
    if (!sectors || sectors.length === 0) return "Not available";
    return sectors.map((s) => s.sector_name).join(", ");
  }

  static convertToCSVData(events: CorporateEvent[]): CorporateEventCSVRow[] {
    return events.map((event) => {
      const target = event.target_counterparty?.new_company as
        | {
            name?: string;
            country?: string;
            _location?: { Country?: string };
            // Legacy sector arrays
            _sectors_primary?: { sector_name: string }[];
            _sectors_secondary?: { sector_name: string }[];
            // New API variant: arrays of strings or objects
            primary_sectors?: Array<string | { sector_name: string }>;
            secondary_sectors?: Array<string | { sector_name: string }>;
          }
        | undefined;

      const formatSectorList = (
        list:
          | Array<string | { sector_name: string }>
          | { sector_name: string }[]
          | undefined
      ): string => {
        if (!list || list.length === 0) return "Not available";
        const names = list
          .map((s) => (typeof s === "string" ? s : s.sector_name))
          .filter(Boolean) as string[];
        return names.length > 0 ? names.join(", ") : "Not available";
      };

      // Split counterparties into buyers/investors and sellers (match dashboard filters)
      const buyersInvestors = (event.other_counterparties || [])
        .filter((cp) => {
          const status = cp._counterparty_type?.counterparty_status || "";
          return /investor|acquirer/i.test(status);
        })
        .map((cp) => cp._new_company?.name)
        .filter(Boolean)
        .join(", ");

      const sellers = (event.other_counterparties || [])
        .filter((cp) => {
          const status = cp._counterparty_type?.counterparty_status || "";
          return /divestor|seller|vendor/i.test(status);
        })
        .map((cp) => cp._new_company?.name)
        .filter(Boolean)
        .join(", ");

      // Format advisors
      const advisors =
        event.advisors
          ?.map((advisor) => advisor._new_company?.name)
          .filter(Boolean)
          .join(", ") || "Not Available";

      // Generate the corporate event link
      const corporateEventLink =
        typeof window !== "undefined"
          ? `${window.location.origin}/corporate-event/${event.id}`
          : `/corporate-event/${event.id}`;

      return {
        Description: event.description || "Not Available",
        Date: this.formatDate(event.announcement_date),
        "Target Name": target?.name || "Not Available",
        "Target HQ":
          target?.country || target?._location?.Country || "Not Available",
        // Prefer new API fields; fallback to legacy
        "Primary Sector":
          formatSectorList(target?.primary_sectors) ||
          this.formatSectors(target?._sectors_primary),
        "Secondary Sectors":
          formatSectorList(target?.secondary_sectors) ||
          this.formatSectors(target?._sectors_secondary),
        "Investment Type": event.deal_type || "Not Available",
        "Amount (m)": this.formatCurrency(
          event.investment_data?.investment_amount_m,
          event.investment_data?.currency?.Currency
        ),
        "EV (m)": this.formatCurrency(
          event.ev_data?.enterprise_value_m,
          event.ev_data?.currency?.Currency
        ),
        "Buyer(s)/Investor(s)": buyersInvestors || "Not Available",
        "Seller(s)": sellers || "Not Available",
        Advisors: advisors,
        "Corporate Event Link": corporateEventLink,
      };
    });
  }

  static convertToCSV(data: CorporateEventCSVRow[]): string {
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
            const value = row[header as keyof CorporateEventCSVRow];
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

  static downloadCSV(
    csvContent: string,
    filename: string = "corporate_events"
  ): void {
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

  static exportCorporateEvents(
    events: CorporateEvent[],
    filename?: string
  ): void {
    const csvData = this.convertToCSVData(events);
    const csvContent = this.convertToCSV(csvData);
    this.downloadCSV(csvContent, filename);
  }
}
