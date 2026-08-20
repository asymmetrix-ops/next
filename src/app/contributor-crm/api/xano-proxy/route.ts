import { NextRequest, NextResponse } from "next/server";
import { proxyContributorXanoRequest } from "@/lib/contributorCrm/server/xanoProxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return await proxyContributorXanoRequest(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error).message || "Failed to load contributor data",
      },
      { status: 500 }
    );
  }
}
