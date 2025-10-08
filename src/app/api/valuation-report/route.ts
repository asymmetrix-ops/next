import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, domain, ai_prompt } = body || {};

    if (!name || !domain) {
      return NextResponse.json(
        { error: "Missing required fields: name and domain" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = { name, domain };
    if (typeof ai_prompt === "string" && ai_prompt.trim().length > 0) {
      payload.ai_prompt = ai_prompt;
    }

    const response = await fetch(
      "https://searxng-master.fly.dev/valuation/report",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // Prevent caching
        cache: "no-store",
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || response.statusText || "Upstream error" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
