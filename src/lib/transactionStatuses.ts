export const TRANSACTION_STATUSES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/transaction_statuses";

export interface TransactionStatusOption {
  id: number;
  label: string;
  created_at?: number;
}

export async function fetchTransactionStatuses(
  init?: RequestInit
): Promise<TransactionStatusOption[]> {
  const response = await fetch(TRANSACTION_STATUSES_URL, {
    method: "GET",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch transaction statuses: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export function transactionStatusFilterLabels(
  statuses: TransactionStatusOption[]
): string[] {
  return statuses.map((status) => status.label.trim()).filter(Boolean);
}

export type TransactionStatusLookupOption = {
  value: string;
  label: string;
  id?: number;
};

export function transactionStatusLookupOptions(
  statuses: TransactionStatusOption[]
): TransactionStatusLookupOption[] {
  return statuses.map((status) => ({
    value: status.label,
    label: status.label,
    id: status.id,
  }));
}
