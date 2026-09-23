import { NextResponse } from "next/server";

type LanguageToolMatch = {
  offset: number;
  length: number;
  context?: { text?: string };
  replacements?: Array<{ value?: string }>;
};

export async function POST(request: Request) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ issues: [] });
  }

  const params = new URLSearchParams();
  params.set("text", text);
  params.set("language", "en-US");

  const ltRes = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!ltRes.ok) {
    return NextResponse.json(
      { error: "Spell check service unavailable" },
      { status: 502 }
    );
  }

  const ltData = (await ltRes.json()) as { matches?: LanguageToolMatch[] };
  const matches = ltData.matches ?? [];

  const issues = matches.map((match) => {
    const offset = match.offset ?? 0;
    const length = match.length ?? 0;
    const word = text.slice(offset, offset + length);
    const suggestions =
      match.replacements
        ?.map((r) => r.value)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .slice(0, 8) ?? [];

    return {
      offset,
      length,
      word,
      context: match.context?.text,
      suggestions,
    };
  });

  return NextResponse.json({ issues });
}
