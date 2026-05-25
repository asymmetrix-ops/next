import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://searxng-corporate-events-analyzer.fly.dev";
const TRIGGER_URL = `${BASE}/api/ia-writer/run-analysis`;

/** Allow up to 17 minutes on this route (Vercel Pro max is 800 s). */
export const maxDuration = 840;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 3_000;
const DEADLINE_MS = 16 * 60 * 1_000; // 16 min hard stop

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function upstreamError(err: unknown): NextResponse {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 502;
    const body = err.response?.data;
    const msg =
      (typeof body === "object" && body !== null
        ? (body as Record<string, string>).error ??
          (body as Record<string, string>).detail
        : null) ??
      err.message ??
      "Upstream request failed";
    console.error("[ia-writer] axios error", err.code, msg);
    return NextResponse.json(
      { error: msg, code: err.code ?? undefined },
      { status }
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[ia-writer] error", msg);
  return NextResponse.json({ error: msg }, { status: 500 });
}

export async function POST(req: NextRequest) {
  // — parse body —
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
    return NextResponse.json(
      { error: "Missing or invalid company_id" },
      { status: 400 }
    );
  }


  let jobId: string;
  try {
    const trigger = await axios.post(
      TRIGGER_URL,
      { company_id: companyId, ...(insiderData ? { insider_data: insiderData } : {}) },
      { headers: { "Content-Type": "application/json" }, timeout: 30_000 }
    );
    const data = trigger.data as { job_id?: string; status?: string };
    if (!data?.job_id) {
      // If the API returns the full result synchronously, pass it through
      return NextResponse.json(data);
    }
    jobId = data.job_id;
    console.log(`[ia-writer] job started: ${jobId}`);
  } catch (err) {
    return upstreamError(err);
  }

  // — poll until done —
  const pollUrl = `${BASE}/api/ia-writer/run-analysis/${jobId}`;
  const deadline = Date.now() + DEADLINE_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    let status: {
      status: string;
      result?: unknown;
      error?: string | null;
      progress?: string | null;
    };

    try {
      const poll = await axios.get(pollUrl, { timeout: 30_000 });
      status = poll.data;
    } catch (err) {
      return upstreamError(err);
    }

    console.log(
      `[ia-writer] job ${jobId} — ${status.status}${status.progress ? ` — ${status.progress}` : ""}`
    );

    if (status.status === "done") {
      return NextResponse.json(status.result ?? status);
    }

    if (status.status === "error") {
      return NextResponse.json(
        { error: status.error ?? "Analysis failed on server" },
        { status: 500 }
      );
    }

    // queued | running → keep polling
  }

  return NextResponse.json(
    { error: "Analysis timed out after 16 minutes" },
    { status: 504 }
  );
}
