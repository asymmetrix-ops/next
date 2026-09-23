import { NextRequest, NextResponse } from "next/server";
import {
  isContributorCrmReferer,
} from "@/lib/contributorCrm/server/contributorCrmRequestGuard";
import { getContributorServiceToken } from "@/lib/contributorCrm/server/serviceAuth";

export const dynamic = "force-dynamic";

const BUSINESS_FOCUSES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/business_focuses";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  try {
    const authorization = authHeader
      ? authHeader
      : isContributorCrmReferer(request)
        ? `Bearer ${await getContributorServiceToken()}`
        : null;

    if (!authorization) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const response = await fetch(BUSINESS_FOCUSES_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { error: text || `Failed to load business focuses (${response.status})` },
        { status: response.status }
      );
    }

    const data = (await response.json().catch(() => null)) as unknown;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load business focuses" },
      { status: 500 }
    );
  }
}
