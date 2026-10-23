import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://searxng-corporate-events-analyzer.fly.dev";
const TRIGGER_URL = `${BASE}/api/ia-writer/run-analysis`;

/** Just triggers the job — returns job_id in < 5 s. */
export const maxDuration = 30;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let companyId: number;
  let insiderData: string | undefined;

  try {
    const body = await req.json();
    companyId =
      typeof body?.company_id === "number"
        ? body.company_id
        : parseInt(String(body?.company_id ?? ""), 10);
    insiderData =
      typeof body?.insider_data === "string" && body.insider_data.trim()
        ? body.insider_data.trim()
        : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Number.isFinite(companyId) || companyId <= 0) {
    return NextResponse.json({ error: "Missing or invalid company_id" }, { status: 400 });
  }

  try {
    const trigger = await axios.post(
      TRIGGER_URL,
      { company_id: companyId, ...(insiderData ? { insider_data: insiderData } : {}) },
      { headers: { "Content-Type": "application/json" }, timeout: 15_000 }
    );
    // Returns { job_id, status, progress, ... } with HTTP 202
    return NextResponse.json(trigger.data, { status: trigger.status });
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
        "Failed to trigger analysis";
      return NextResponse.json({ error: msg, code: err.code }, { status });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
