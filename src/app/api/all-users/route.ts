import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const XANO_ALL_USERS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI/all_users";

type NormalizedBasicUser = {
  id: number;
  name: string;
  email: string;
  Company?: number;
  created_at?: number;
};

function normalizeAllUsers(data: unknown): NormalizedBasicUser[] {
  let rows: unknown[] = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const candidates = [
      o.all_users,
      o.items,
      o.users,
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

  const out: NormalizedBasicUser[] = [];
  const seen = new Set<number>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const idRaw = r.id ?? r._id ?? r.user_id ?? r.User_id;
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

    const email = String(r.email ?? r.Email ?? "").trim();
    const name =
      String(r.name ?? r.Name ?? "").trim() ||
      email ||
      `User #${id}`;

    const companyRaw = r.Company ?? r.company ?? r.company_id;
    let Company: number | undefined;
    if (typeof companyRaw === "number" && Number.isFinite(companyRaw)) {
      Company = Math.trunc(companyRaw);
    } else if (typeof companyRaw === "string") {
      const cn = parseInt(companyRaw, 10);
      if (Number.isFinite(cn)) Company = cn;
    }

    const createdRaw = r.created_at;
    const created_at =
      typeof createdRaw === "number" && Number.isFinite(createdRaw)
        ? createdRaw
        : undefined;

    out.push({
      id,
      name,
      email,
      ...(Company !== undefined ? { Company } : {}),
      ...(created_at !== undefined ? { created_at } : {}),
    });
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

  const resp = await fetch(XANO_ALL_USERS_URL, {
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
  const users = normalizeAllUsers(data);
  return NextResponse.json(users);
}
