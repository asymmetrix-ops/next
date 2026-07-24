import { NextRequest, NextResponse } from "next/server";
import { uploadServiceFile } from "@/lib/contributorCrm/server/contributorApi";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const stored = await uploadServiceFile(file);
    return NextResponse.json(stored);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "File upload failed" },
      { status: 500 }
    );
  }
}
