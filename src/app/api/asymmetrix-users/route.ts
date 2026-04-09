import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const XANO_USERS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI/asymmetrix_users";

/** Xano list endpoints may return a bare array or wrapped `{ items: [...] }` rows with varying id keys. */
function normalizeAsymmetrixUsers(
  data: unknown
): Array<{ id: number; name: string }> {
  let rows: unknown[] = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const candidates = [
      o.items,
      o.users,
      o.asymmetrix_users,
      o.result,
      o.data,
      o.records,
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) {
        rows = c;
        break;
      }
    }
  }

  const out: Array<{ id: number; name: string }> = [];
  const seen = new Set<number>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const idRaw =
      r.id ??
      r._id ??
      r.user_id ??
      r.User_id ??
      r.asymmetrix_users_id ??
      r.Asymmetrix_Users_id;

    let id: number;
    if (typeof idRaw === "number" && Number.isFinite(idRaw)) {
      id = Math.trunc(idRaw);
    } else if (typeof idRaw === "string") {
      const n = parseInt(idRaw, 10);
      if (!Number.isFinite(n)) continue;
      id = n;
    } else {
      continue;
    }
    if (id <= 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const name =
      String(r.name ?? r.Name ?? r.email ?? r.Email ?? "").trim() ||
      `User #${id}`;
    out.push({ id, name });
  }
  return out;
}

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
  const users = normalizeAsymmetrixUsers(data);
  return NextResponse.json(users);
}
