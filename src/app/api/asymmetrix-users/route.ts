import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const XANO_USERS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI/asymmetrix_users";

function getBearerFromRequest(request: NextRequest): string | null {
  const auth =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer "))
    return auth.slice(7).trim();
  return null;
}

function getBearerFromCookie(): string | null {
  try {
    return cookies().get("asymmetrix_auth_token")?.value ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = getBearerFromCookie() || getBearerFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resp = await fetch(XANO_USERS_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: `Xano error ${resp.status}`, details: text },
      { status: resp.status >= 500 ? 502 : resp.status }
    );
  }

  const data = await resp.json();
  return NextResponse.json(data);
}
