import { NextRequest, NextResponse } from "next/server";
import { postServiceDataContributionNotification } from "@/lib/contributorCrm/server/contributorApi";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (!payload?.contributor_email || !String(payload.contributor_email).trim()) {
      return NextResponse.json(
        { error: "Contributor email is required." },
        { status: 400 }
      );
    }

    await postServiceDataContributionNotification(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error).message || "Failed to send data contribution notification",
      },
      { status: 500 }
    );
  }
}
