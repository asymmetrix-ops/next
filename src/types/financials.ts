export interface CurrencyToggleField {
  preferredValue: number | null;
  preferredCurrency: string | null;
  reportedValue: number | null;
  reportedCurrency: string | null;
  converted: boolean;
  isApproximate: boolean;
}

export type CurrencyMode = "preferred" | "reported";
