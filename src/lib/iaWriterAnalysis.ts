/** Rewritten proxy path (see next.config.js) — avoids API route proxy timeouts. */
export const IA_WRITER_RUN_ANALYSIS_PATH =
  "/analyzer-proxy/api/ia-writer/run-analysis";

export const IA_WRITER_RUN_ANALYSIS_URL =
  "https://searxng-corporate-events-analyzer.fly.dev/api/ia-writer/run-analysis";

export type IaWriterApiError = {
  error?: string;
  detail?: string;
  details?: string;
  cause?: string;
  code?: string;
};

export function formatIaWriterError(
  data: unknown,
  status?: number
): string {
  if (!data || typeof data !== "object") {
    return status ? `Request failed (HTTP ${status})` : "Request failed";
  }
  const d = data as IaWriterApiError;
  const parts = [
    d.error || d.detail,
    d.details,
    d.cause ? `Cause: ${d.cause}` : null,
    d.code ? `Code: ${d.code}` : null,
    status ? `HTTP ${status}` : null,
  ].filter((p): p is string => Boolean(p));
  return parts.join(" · ") || "Request failed";
}

export function formatThrownError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts = [err.message];
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    parts.push(`Cause: ${cause.message}`);
    const code = (cause as NodeJS.ErrnoException).code;
    if (code) parts.push(`Code: ${code}`);
  } else if (cause) {
    parts.push(`Cause: ${String(cause)}`);
  }
  return parts.join(" · ");
}
