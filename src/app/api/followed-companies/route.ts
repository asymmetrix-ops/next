import { NextResponse } from "next/server";

export async function POST(req: Request) {
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

    const body = (await req.json().catch(() => null)) as
      | { user_id?: unknown; new_company_id?: unknown }
      | null;

    const userId =
      body && typeof body.user_id === "number" && Number.isFinite(body.user_id)
        ? body.user_id
        : body && typeof body.user_id === "string"
        ? Number.parseInt(body.user_id, 10)
        : NaN;

    const companyId =
      body && typeof body.new_company_id === "number" && Number.isFinite(body.new_company_id)
        ? body.new_company_id
        : body && typeof body.new_company_id === "string"
        ? Number.parseInt(body.new_company_id, 10)
        : NaN;

    if (!Number.isFinite(userId) || !Number.isFinite(companyId)) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const endpoint =
      "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI/users/followed_companies";

    // Prefer standard Bearer, fallback to raw token if 401
    let resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId, new_company_id: companyId }),
      cache: "no-store",
    });

    if (resp.status === 401) {
      resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({ user_id: userId, new_company_id: companyId }),
        cache: "no-store",
      });
    }

    const text = await resp.text().catch(() => "");
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!resp.ok) {
      return NextResponse.json(
        { error: "Upstream error", statusText: resp.statusText, data },
        { status: resp.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

