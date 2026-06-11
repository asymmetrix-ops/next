import { NextRequest, NextResponse } from "next/server";

const GET_UNSENT_EMAILS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/get_unsent_emails";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";

  let body: { user_email_alerts_id?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const ids = body.user_email_alerts_id;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json([]);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  const params = new URLSearchParams();
  ids.forEach((id) => params.append("user_email_alerts_id", String(id)));

  const res = await fetch(`${GET_UNSENT_EMAILS_URL}?${params.toString()}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: text || res.statusText },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}
