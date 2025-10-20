import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Avoid path traversal and collisions by normalizing the filename
    const baseName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const targetPath = path.join(uploadsDir, baseName);

    fs.writeFileSync(targetPath, buffer);

    return NextResponse.json({ url: `/uploads/${baseName}` });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
