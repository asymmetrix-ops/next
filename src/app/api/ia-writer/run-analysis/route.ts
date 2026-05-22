import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

import { IA_WRITER_RUN_ANALYSIS_URL } from "@/lib/iaWriterAnalysis";

/** Analysis can take 5–7 minutes; allow up to 7 min on this route. */
export const maxDuration = 420;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM_TIMEOUT_MS = 8 * 60 * 1000;

function serializeUpstreamError(err: unknown): {
  error: string;
  details?: string;
  cause?: string;
  code?: string;
} {
  if (axios.isAxiosError(err)) {
    const cause = err.cause;
    const responseBody =
      typeof err.response?.data === "string"
        ? err.response.data.slice(0, 800)
        : err.response?.data
          ? JSON.stringify(err.response.data).slice(0, 800)
          : undefined;

    return {
      error: err.message || "Upstream request failed",
      details: [
        err.code,
        err.response?.status != null && `HTTP ${err.response.status}`,
        responseBody,
        cause instanceof Error ? cause.message : cause ? String(cause) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      cause: cause instanceof Error ? cause.message : undefined,
      code: err.code,
    };
  }

  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    return {
      error: err.message,
      details: cause instanceof Error ? cause.message : cause ? String(cause) : undefined,
      cause: cause instanceof Error ? cause.message : undefined,
      code: (err as NodeJS.ErrnoException).code,
    };
  }

  return { error: String(err) };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companyId = body?.company_id;

    const id =
      typeof companyId === "number" ? companyId : parseInt(String(companyId), 10);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid company_id" },
        { status: 400 }
      );
    }

    const response = await axios.post(IA_WRITER_RUN_ANALYSIS_URL, { company_id: id }, {
      headers: { "Content-Type": "application/json" },
      timeout: UPSTREAM_TIMEOUT_MS,
      validateStatus: () => true,
    });

    // 202 Accepted = async job started
    if (response.status < 200 || response.status >= 400) {
      const errBody =
        typeof response.data === "object" && response.data !== null
          ? response.data
          : { error: String(response.data ?? response.statusText) };
      return NextResponse.json(
        {
          error:
            (errBody as { error?: string }).error ||
            (errBody as { detail?: string }).detail ||
            `Upstream error (HTTP ${response.status})`,
          details: JSON.stringify(errBody).slice(0, 800),
        },
        { status: response.status }
      );
    }

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: unknown) {
    console.error("[ia-writer/run-analysis]", error);
    const payload = serializeUpstreamError(error);
    return NextResponse.json(payload, { status: 500 });
  }
}
