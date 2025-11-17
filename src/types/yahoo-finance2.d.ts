declare module "yahoo-finance2" {
  // Relaxed, but typed enough to satisfy TypeScript and ESLint without using `any`
  type YahooFinanceMethod = (...args: unknown[]) => Promise<unknown>;

  interface YahooFinanceInstance {
    chart: YahooFinanceMethod;
    quote: YahooFinanceMethod;
    quoteSummary: YahooFinanceMethod;
    search: YahooFinanceMethod;
    // Allow access to other properties/methods without strict typing
    [key: string]: unknown;
  }

  const yahooFinance: YahooFinanceInstance;
  export default yahooFinance;
}

