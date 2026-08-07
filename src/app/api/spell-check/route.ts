import { NextRequest, NextResponse } from "next/server";

import {
  normalizeSpellCheckIssues,
} from "@/lib/spellCheck";

type LanguageToolMatch = {
  offset?: number;
  length?: number;
  message?: string;
  replacements?: Array<{ value?: string }>;
  context?: { text?: string };
  rule?: { issueType?: string; category?: { id?: string } };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LANGUAGE_TOOL_URL = "https://api.languagetool.org/v2/check";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text =
    body && typeof body === "object" && "text" in body
      ? String((body as { text?: unknown }).text ?? "").trim()
      : "";

  if (!text) {
    return NextResponse.json({ issues: [] });
  }

  if (text.length > 20_000) {
    return NextResponse.json(
      { error: "Text is too long to spell check (max 20,000 characters)." },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      text,
      language: "en-US",
      enabledOnly: "false",
    });

    const resp = await fetch(LANGUAGE_TOOL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
      cache: "no-store",
    });

    if (!resp.ok) {
      const details = await resp.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Spell check service unavailable",
          details: details.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const data = (await resp.json()) as { matches?: LanguageToolMatch[] };
    const issues = normalizeSpellCheckIssues(
      text,
      Array.isArray(data.matches) ? data.matches : []
    );

    return NextResponse.json({ issues });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Spell check service unavailable",
      },
      { status: 502 }
    );
  }
}
