import { NextRequest, NextResponse } from "next/server";

const BUSINESS_FOCUSES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop/business_focuses";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  try {
    const response = await fetch(BUSINESS_FOCUSES_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
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
