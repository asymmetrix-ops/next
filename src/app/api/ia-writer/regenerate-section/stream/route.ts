import { NextRequest, NextResponse } from "next/server";

const STREAM_URL =
  "https://searxng-corporate-events-analyzer.fly.dev/api/ia-writer/regenerate-section/stream";

/** Pipes the SSE stream from Fly through to the browser. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const { company_id, section, feedback, insider_data, compiled_sections } =
    body as Record<string, unknown>;

  const id =
    typeof company_id === "number"
      ? company_id
      : parseInt(String(company_id ?? ""), 10);

  if (!Number.isFinite(id) || id <= 0)
    return NextResponse.json({ error: "Missing or invalid company_id" }, { status: 400 });
  if (!section || typeof section !== "string")
    return NextResponse.json({ error: "Missing section" }, { status: 400 });

  const payload: Record<string, unknown> = { company_id: id, section };
  if (feedback && typeof feedback === "string" && (feedback as string).trim())
    payload.feedback = (feedback as string).trim();
  if (insider_data && typeof insider_data === "string" && (insider_data as string).trim())
    payload.insider_data = (insider_data as string).trim();
  if (compiled_sections && typeof compiled_sections === "object")
    payload.compiled_sections = compiled_sections;

  const upstream = await fetch(STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    let msg = text.slice(0, 500);
    try { msg = (JSON.parse(text) as { error?: string }).error ?? msg; } catch { /* noop */ }
    return NextResponse.json({ error: msg }, { status: upstream.status });
  }

  // Pipe the SSE body directly to the client
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
