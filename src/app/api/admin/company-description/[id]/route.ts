import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const XANO_DESCRIPTION_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";

function getToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return authHeader?.trim() || null;
}

async function fetchWithAuth(url: string, token: string, init: RequestInit = {}) {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let resp = await fetch(url, {
    ...init,
    headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (resp.status === 401) {
    resp = await fetch(url, {
      ...init,
      headers: { ...baseHeaders, Authorization: token },
      cache: "no-store",
    });
  }

  return resp;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  try {
    const upstream = await fetchWithAuth(
      `${XANO_DESCRIPTION_BASE}/get_company_description_data/${companyId}`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ new_company_id: companyId }),
      }
    );

    const text = await upstream.text().catch(() => "");
    if (!upstream.ok) {
      return NextResponse.json(
        { error: text || upstream.statusText },
        { status: upstream.status }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
