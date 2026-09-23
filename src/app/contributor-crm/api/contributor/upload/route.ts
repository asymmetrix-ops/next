import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessContributorCrmPage } from "@/lib/contributorCrm/server/contributorCrmRequestGuard";
import { uploadServiceFile } from "@/lib/contributorCrm/server/contributorApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = rejectUnlessContributorCrmPage(request);
  if (blocked) return blocked;

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
