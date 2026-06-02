import { NextRequest, NextResponse } from "next/server";

import { getCsvDownload, stashCsvDownload } from "@/lib/csvDownloadStore";

function sanitizeFilename(name: string): string {
  const trimmed = name.trim() || "export.csv";
  const withExt = trimmed.toLowerCase().endsWith(".csv")
    ? trimmed
    : `${trimmed}.csv`;
  return withExt.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function csvResponse(content: string, filename: string): NextResponse {
  const safeName = sanitizeFilename(filename);
  const withBom = content.startsWith("\uFEFF") ? content : `\uFEFF${content}`;

  return new NextResponse(withBom, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** GET ?token= — serve stashed CSV (form navigation / new tab). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return new NextResponse("Missing download token. Export again from the app.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const entry = getCsvDownload(token);
  if (!entry) {
    return new NextResponse(
      "Download link expired or invalid. Export again from the app.",
      { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  return csvResponse(entry.content, entry.filename);
}

/**
 * POST JSON { content, filename } → { token }
 * POST form (legacy) content + filename → CSV directly
 */
export async function POST(request: NextRequest) {
  try {
    let content = "";
    let filename = "export.csv";
    let returnTokenOnly = false;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        content?: string;
        filename?: string;
        prepare?: boolean;
      };
      content = String(body.content ?? "");
      filename = String(body.filename ?? filename);
      returnTokenOnly = body.prepare !== false;
    } else {
      const formData = await request.formData();
      content = String(formData.get("content") ?? "");
      filename = String(formData.get("filename") ?? filename);
      returnTokenOnly = false;
    }

    if (!content) {
      return NextResponse.json(
        { error: "No CSV content provided" },
        { status: 400 }
      );
    }

    if (returnTokenOnly) {
      const token = stashCsvDownload(content, filename);
      return NextResponse.json({ token });
    }

    return csvResponse(content, filename);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
