import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

const REGEN_URL =
  "https://searxng-corporate-events-analyzer.fly.dev/api/ia-writer/regenerate-section";

/** Synchronous endpoint — ~15-30 s. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { company_id, section, feedback, insider_data, compiled_sections } =
    body as {
      company_id?: unknown;
      section?: unknown;
      feedback?: unknown;
      insider_data?: unknown;
      compiled_sections?: unknown;
    };

  const id =
    typeof company_id === "number"
      ? company_id
      : parseInt(String(company_id ?? ""), 10);

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Missing or invalid company_id" }, { status: 400 });
  }
  if (!section || typeof section !== "string") {
    return NextResponse.json({ error: "Missing section" }, { status: 400 });
  }

  const payload: Record<string, unknown> = { company_id: id, section };
  if (feedback && typeof feedback === "string" && feedback.trim())
    payload.feedback = feedback.trim();
  if (insider_data && typeof insider_data === "string" && insider_data.trim())
    payload.insider_data = insider_data.trim();
  if (compiled_sections && typeof compiled_sections === "object")
    payload.compiled_sections = compiled_sections;

  try {
    const res = await axios.post(REGEN_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 55_000,
    });
    return NextResponse.json(res.data, { status: res.status });
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 502;
      const d = err.response?.data;
      const msg =
        (typeof d === "object" && d !== null
          ? (d as Record<string, string>).error ??
            (d as Record<string, string>).detail
          : null) ??
        err.message ??
        "Regeneration failed";
      return NextResponse.json({ error: msg, code: err.code }, { status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
