import { CorporateEvent } from "../types/corporateEvents";

export interface CorporateEventCSVRow {
  Description: string;
  "Date Announced": string;
  "Target Name": string;
  "Target Country": string;
  "Primary Sector": string;
  "Secondary Sectors": string;
  Type: string;
  Investment: string;
  "Enterprise Value": string;
  "Other Counterparties": string;
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
      const target = event.target_counterparty?.new_company;

      // Format other counterparties
      const otherCounterparties =
        event.other_counterparties
          ?.map((counterparty) => counterparty._new_company.name)
          .filter(Boolean)
          .join(", ") || "Not Available";

      // Format advisors
      const advisors =
        event.advisors
          ?.map((advisor) => advisor._new_company.name)
          .filter(Boolean)
          .join(", ") || "Not Available";

      // Generate the corporate event link
      const corporateEventLink = `${window.location.origin}/corporate-event/${event.id}`;

      return {
        Description: event.description || "Not Available",
        "Date Announced": this.formatDate(event.announcement_date),
        "Target Name": target?.name || "Not Available",
        "Target Country": target?.country || "Not Available",
        "Primary Sector": this.formatSectors(target?._sectors_primary),
        "Secondary Sectors": this.formatSectors(target?._sectors_secondary),
        Type: event.deal_type || "Not Available",
        Investment: this.formatCurrency(
          event.investment_data?.investment_amount_m,
          event.investment_data?.currency?.Currency
        ),
        "Enterprise Value": this.formatCurrency(
          event.ev_data?.enterprise_value_m,
          event.ev_data?.currency?.Currency
        ),
        "Other Counterparties": otherCounterparties,
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
    const csvContent = [
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
    ].join("\n");

    return csvContent;
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
