import { NextRequest, NextResponse } from "next/server";
import { postServiceChangeRequest } from "@/lib/contributorCrm/server/contributorApi";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (!payload?.submitted_by || !String(payload.submitted_by).trim()) {
      return NextResponse.json(
        { error: "Contributor email is required." },
        { status: 400 }
      );
    }

    await postServiceChangeRequest(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to submit change request" },
      { status: 500 }
    );
  }
}
