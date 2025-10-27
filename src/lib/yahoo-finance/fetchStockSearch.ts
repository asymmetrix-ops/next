import { unstable_noStore as noStore } from "next/cache";
import yahooFinance from "yahoo-finance2";

export async function fetchStockSearch(ticker: string, newsCount: number = 5) {
  noStore();

  const queryOptions = {
    quotesCount: 1,
    newsCount: newsCount,
    enableFuzzyQuery: true,
  };

  try {
    const response = await yahooFinance.search(ticker, queryOptions);

    return response;
  } catch (error) {
    console.log("Failed to fetch stock search", error);
    throw new Error("Failed to fetch stock search.");
  }
}
