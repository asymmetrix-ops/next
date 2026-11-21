import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { requireAuthUser } from "@/lib/emailAlertsServer";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

// Raster images only (no SVG/HTML, which would be served from our origin and
// could carry scripts). Extension comes from the validated type, never from
// the client-supplied file name.
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BYTES + 100_000) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Random name: no overwriting of existing files, no client-controlled path.
    const name = `${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, name), buffer, { flag: "wx" });

    return NextResponse.json({ url: `/uploads/${name}` });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
