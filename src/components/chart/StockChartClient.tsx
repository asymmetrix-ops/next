"use client";

import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import type { Interval, Range } from "@/types/yahoo-finance";
import AreaClosedChart from "./AreaClosedChart";

interface StockGraphProps {
  ticker: string;
  range: Range;
  interval: Interval;
}

interface ChartQuote {
  date: Date;
  close: number;
}

interface ChartMeta {
  regularMarketPrice: number;
}

interface ChartData {
  quotes: Array<{ date: Date | null; close?: number }>;
  meta: ChartMeta;
}

interface QuoteData {
  symbol: string;
  fullExchangeName: string;
  shortName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  hasPrePostMarketData?: boolean;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
}

const rangeTextMapping: Record<Range, string> = {
  "1d": "",
  "1w": "Past Week",
  "1m": "Past Month",
  "3m": "Past 3 Months",
  "1y": "Past Year",
};

function calculatePriceChange(qouteClose: number, currentPrice: number) {
  const firstItemPrice = qouteClose || 0;
  return ((currentPrice - firstItemPrice) / firstItemPrice) * 100;
}

export default function StockChartClient({
  ticker,
  range,
  interval,
}: StockGraphProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch chart data
        const chartResponse = await fetch(
          `/api/stock/chart?ticker=${ticker}&range=${range}&interval=${interval}`
        );
        if (!chartResponse.ok) throw new Error("Failed to fetch chart data");
        const chart = await chartResponse.json();

        // Fetch quote data
        const quoteResponse = await fetch(`/api/stock/quote?ticker=${ticker}`);
        if (!quoteResponse.ok) throw new Error("Failed to fetch quote data");
        const quote = await quoteResponse.json();

        setChartData(chart);
        setQuoteData(quote);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker, range, interval]);

  if (loading) {
    return (
      <div className="flex h-[27.5rem] items-center justify-center text-gray-500">
        Loading chart...
      </div>
    );
  }

  if (error || !chartData || !quoteData) {
    return (
      <div className="flex h-[27.5rem] items-center justify-center text-red-500">
        {error || "Failed to load chart"}
      </div>
    );
  }

  const priceChange =
    chartData.quotes.length &&
    calculatePriceChange(
      Number(chartData.quotes[0].close),
      Number(chartData.meta.regularMarketPrice)
    );

  const ChartQuotes: ChartQuote[] = chartData.quotes
    .map((quote) => ({
      date: quote.date as Date,
      close: Number(quote.close?.toFixed(2)),
    }))
    .filter((quote) => !isNaN(quote.close) && quote.date !== null);

  return (
    <div className="h-[27.5rem] w-full">
      <div>
        <div className="space-x-1 text-gray-500">
          <span className="font-bold text-gray-900">{quoteData.symbol}</span>
          <span>·</span>
          <span>
            {quoteData.fullExchangeName === "NasdaqGS"
              ? "NASDAQ"
              : quoteData.fullExchangeName}
          </span>
          <span>{quoteData.shortName}</span>
        </div>

        <div className="flex flex-row justify-between items-end">
          <div className="space-x-1">
            <span className="text-nowrap">
              <span className="text-xl font-bold">
                {quoteData.currency === "USD" ? "$" : ""}
                {quoteData.regularMarketPrice?.toFixed(2)}
              </span>
              <span className="font-semibold">
                {quoteData.regularMarketChange &&
                quoteData.regularMarketChangePercent !== undefined ? (
                  quoteData.regularMarketChange > 0 ? (
                    <span className="text-green-600">
                      +{quoteData.regularMarketChange.toFixed(2)} (+
                      {quoteData.regularMarketChangePercent.toFixed(2)}%)
                    </span>
                  ) : (
                    <span className="text-red-600">
                      {quoteData.regularMarketChange.toFixed(2)} (
                      {quoteData.regularMarketChangePercent.toFixed(2)}%)
                    </span>
                  )
                ) : null}
              </span>
            </span>
            <span className="inline space-x-1 font-semibold text-gray-500">
              {quoteData.postMarketPrice && (
                <>
                  <span>·</span>
                  <span>
                    Post-Market: {quoteData.currency === "USD" ? "$" : ""}
                    {quoteData.postMarketPrice.toFixed(2)}
                  </span>
                  <span>
                    {quoteData.postMarketChange &&
                    quoteData.postMarketChangePercent !== undefined ? (
                      quoteData.postMarketChange > 0 ? (
                        <span className="text-green-600">
                          +{quoteData.postMarketChange.toFixed(2)} (+
                          {quoteData.postMarketChangePercent.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="text-red-600">
                          {quoteData.postMarketChange.toFixed(2)} (
                          {quoteData.postMarketChangePercent.toFixed(2)}%)
                        </span>
                      )
                    ) : null}
                  </span>
                </>
              )}
              {quoteData.preMarketPrice && (
                <>
                  <span>·</span>
                  <span>
                    Pre-Market: {quoteData.currency === "USD" ? "$" : ""}
                    {quoteData.preMarketPrice.toFixed(2)}
                  </span>
                  <span>
                    {quoteData.preMarketChange &&
                    quoteData.preMarketChangePercent !== undefined ? (
                      quoteData.preMarketChange > 0 ? (
                        <span className="text-green-600">
                          +{quoteData.preMarketChange.toFixed(2)} (+
                          {quoteData.preMarketChangePercent.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="text-red-600">
                          {quoteData.preMarketChange.toFixed(2)} (
                          {quoteData.preMarketChangePercent.toFixed(2)}%)
                        </span>
                      )
                    ) : null}
                  </span>
                </>
              )}
            </span>
          </div>
          <span className="space-x-1 font-semibold whitespace-nowrap">
            {priceChange !== 0 && rangeTextMapping[range] !== "" && (
              <span
                className={cn(
                  priceChange > 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {priceChange > 0
                  ? `+${priceChange.toFixed(2)}%`
                  : `${priceChange.toFixed(2)}%`}
              </span>
            )}
            <span className="text-gray-500">{rangeTextMapping[range]}</span>
          </span>
        </div>
      </div>
      {chartData.quotes.length === 0 && (
        <div className="flex justify-center items-center h-full text-center text-neutral-500">
          No data available
        </div>
      )}
      {chartData.quotes.length > 0 && (
        <AreaClosedChart chartQuotes={ChartQuotes} range={range} />
      )}
    </div>
  );
}
