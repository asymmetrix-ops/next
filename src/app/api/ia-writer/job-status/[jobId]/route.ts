import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://searxng-corporate-events-analyzer.fly.dev";

/** Quick proxy — just fetches status from Fly and returns it. */
export const maxDuration = 30;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const res = await axios.get(
      `${BASE}/api/ia-writer/run-analysis/${encodeURIComponent(jobId)}`,
      { timeout: 15_000 }
    );
    return NextResponse.json(res.data, { status: res.status });
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 502;
      const body = err.response?.data;
      const msg =
        (typeof body === "object" && body !== null
          ? (body as Record<string, string>).error ??
            (body as Record<string, string>).detail
          : null) ??
        err.message ??
        "Failed to fetch job status";
      return NextResponse.json({ error: msg, code: err.code }, { status });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
