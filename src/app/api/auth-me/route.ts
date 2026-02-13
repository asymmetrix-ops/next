import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Read token from cookie or header forwarded by client
    const tokenCookie = (await import("next/headers"))
      .cookies()
      .get("asymmetrix_auth_token")?.value;

    const tokenHeader = (await import("next/headers"))
      .headers()
      .get("x-asym-token");

    const token = tokenCookie || tokenHeader;
    if (!token) {
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 401 }
      );
    }

    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

    // Prefer standard Bearer, fallback to raw token if 401
    let resp = await fetch(`${apiUrl}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // Server-to-server request; no CORS
      cache: "no-store",
    });

    if (resp.status === 401) {
      resp = await fetch(`${apiUrl}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        cache: "no-store",
      });
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return NextResponse.json(
        { error: "Upstream error", statusText: resp.statusText, text },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
