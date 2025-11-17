import { unstable_noStore as noStore } from "next/cache";
import yahooFinance from "yahoo-finance2";
import type { Interval, Range } from "@/types/yahoo-finance";
import { DEFAULT_RANGE, INTERVALS_FOR_RANGE, VALID_RANGES } from "./constants";
import { CalculateRange } from "./utils";

export const validateRange = (range: string): Range =>
  VALID_RANGES.includes(range as Range) ? (range as Range) : DEFAULT_RANGE;

export const validateInterval = (range: Range, interval: Interval): Interval =>
  INTERVALS_FOR_RANGE[range].includes(interval)
    ? interval
    : INTERVALS_FOR_RANGE[range][0];

export interface YahooChartQuote {
  close: number | null;
  date: Date | null;
}

export interface YahooChartData {
  quotes: YahooChartQuote[];
  meta: {
    regularMarketPrice?: number | null;
  };
}

export async function fetchChartData(
  ticker: string,
  range: Range,
  interval: Interval
): Promise<YahooChartData> {
  noStore();

  const queryOptions = {
    period1: CalculateRange(range),
    interval: interval,
  };

  try {
    const chartData = (await yahooFinance.chart(
      ticker,
      queryOptions
    )) as YahooChartData;

    return chartData;
  } catch (error) {
    console.log("Failed to fetch chart data", error);
    throw new Error("Failed to fetch chart data.");
  }
}
