import { unstable_noStore as noStore } from "next/cache";
import yahooFinance from "yahoo-finance2";

export interface YahooQuoteData {
  symbol?: string;
  fullExchangeName?: string;
  shortName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
}

export async function fetchQuote(ticker: string): Promise<YahooQuoteData> {
  noStore();

  try {
    const response = (await yahooFinance.quote(ticker)) as YahooQuoteData;

    return response;
  } catch (error) {
    console.log("Failed to fetch stock quote", error);
    throw new Error("Failed to fetch stock quote.");
  }
}
