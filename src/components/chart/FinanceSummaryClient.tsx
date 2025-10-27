"use client";

import { useState, useEffect } from "react";

function formatNumber(num: number) {
  if (num >= 1e12) {
    return `${(num / 1e12).toFixed(2)}T`;
  } else if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else {
    return num.toString();
  }
}

interface DisplayItem {
  key: string;
  title: string;
  format?: (data: number) => string;
  section?: string;
}

const keysToDisplay: DisplayItem[] = [
  {
    key: "open",
    title: "Open",
  },
  { key: "dayHigh", title: "High" },
  { key: "dayLow", title: "Low" },
  { key: "volume", title: "Vol", format: formatNumber },
  { key: "trailingPE", title: "P/E" },
  { key: "marketCap", title: "Mkt cap", format: formatNumber },
  { key: "fiftyTwoWeekHigh", title: "52W H" },
  { key: "fiftyTwoWeekLow", title: "52W L" },
  { key: "averageVolume", title: "Avg Vol", format: formatNumber },
  {
    key: "dividendYield",
    title: "Div yield",
    format: (data: number) => `${(data * 100).toFixed(2)}%`,
  },
  { key: "beta", title: "Beta" },
  { key: "trailingEps", title: "EPS", section: "defaultKeyStatistics" },
];

export default function FinanceSummaryClient({ ticker }: { ticker: string }) {
  const [financeSummaryData, setFinanceSummaryData] = useState<Record<
    string,
    Record<string, unknown>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/stock/summary?ticker=${ticker}`);
        if (!response.ok) throw new Error("Failed to fetch summary data");
        const data = await response.json();

        setFinanceSummaryData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-500">
        Loading summary...
      </div>
    );
  }

  if (error || !financeSummaryData) {
    return (
      <div className="flex h-40 items-center justify-center text-red-500">
        {error || "Failed to load summary"}
      </div>
    );
  }

  return (
    <div className="grid grid-flow-col grid-rows-6 gap-4 md:grid-rows-3">
      {keysToDisplay.map((item) => {
        const section = item.section || "summaryDetail";
        const sectionData = financeSummaryData?.[section];
        const data = sectionData?.[item.key];
        let formattedData: string | number = "N/A";

        if (data !== undefined && typeof data === "number" && !isNaN(data)) {
          formattedData = item.format ? item.format(data) : data;
        }
        return (
          <div
            key={item.key}
            className="flex flex-row items-center justify-between font-medium"
          >
            <span className="text-gray-500">{item.title}</span>
            <span>{formattedData}</span>
          </div>
        );
      })}
    </div>
  );
}
