import { NextRequest, NextResponse } from "next/server";

const GET_CLIENT_COMPANIES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI/get_client_companies";

type XanoClientCompanyRow = {
  user_Company1?: number;
  _new_company?: { name?: string };
};

export type ClientCompanyOption = {
  id: number;
  name: string;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  const res = await fetch(GET_CLIENT_COMPANIES_URL, { method: "GET", headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: text || res.statusText },
      { status: res.status }
    );
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    return NextResponse.json([]);
  }

  const companies: ClientCompanyOption[] = [];
  const seen = new Set<number>();

  for (const row of data as XanoClientCompanyRow[]) {
    const id = row.user_Company1;
    if (typeof id !== "number" || id <= 0 || seen.has(id)) continue;
    const name = row._new_company?.name?.trim();
    if (!name) continue;
    seen.add(id);
    companies.push({ id, name });
  }

  companies.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(companies);
}
