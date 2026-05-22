/** Rewritten proxy paths (see next.config.js). */
export const IA_WRITER_RUN_ANALYSIS_PATH =
  "/analyzer-proxy/api/ia-writer/run-analysis";

export const IA_WRITER_RUN_ANALYSIS_URL =
  "https://searxng-corporate-events-analyzer.fly.dev/api/ia-writer/run-analysis";

export function iaWriterJobStatusPath(jobId: string): string {
  return `/analyzer-proxy/api/ia-writer/run-analysis/${encodeURIComponent(jobId)}`;
}

export type FullAnalysisResult = {
  company_id: number;
  company_name: string;
  sections_written: number;
  total_chars: number;
  sections: Record<string, string>;
  markdown?: string;
};

export type AnalysisJobStatus = {
  job_id: string;
  status: "queued" | "running" | "done" | "error";
  company_id: number;
  company_name: string | null;
  progress: string | null;
  result: FullAnalysisResult | null;
  error: string | null;
};

export type IaWriterApiError = {
  error?: string;
  detail?: string;
  details?: string;
  cause?: string;
  code?: string;
};

export const POLL_INTERVAL_MS = 3000;
export const MAX_POLL_MS = 8 * 60 * 1000;

export function isAnalysisJobStatus(data: unknown): data is AnalysisJobStatus {
  if (!data || typeof data !== "object") return false;
  const d = data as AnalysisJobStatus;
  return (
    typeof d.job_id === "string" &&
    typeof d.status === "string" &&
    typeof d.company_id === "number"
  );
}

export function isFullAnalysisResult(data: unknown): data is FullAnalysisResult {
  if (!data || typeof data !== "object") return false;
  const d = data as FullAnalysisResult;
  return (
    typeof d.company_id === "number" &&
    typeof d.sections === "object" &&
    d.sections !== null
  );
}

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

export async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid JSON in response"
        : formatIaWriterError(
            { error: text.slice(0, 500) || res.statusText },
            res.status
          )
    );
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
