import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CompanySearchedRow = {
  query: string | null;
  filters_used: string;
  search_count: number;
  unique_users: number;
  unique_sessions: number;
};

const XANO_ENDPOINT =
  process.env.XANO_COMPANY_SEARCHES_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0:develop/get_company_searched";

export async function GET() {
  try {
    const upstream = await fetch(XANO_ENDPOINT, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream error", statusText: upstream.statusText, text },
        { status: upstream.status }
      );
    }

    let data: unknown = null;
    try {
      data = text ? (JSON.parse(text) as unknown) : [];
    } catch {
      data = text;
    }

    // If Xano returns something unexpected, still pass it through as-is.
    if (!Array.isArray(data)) {
      return NextResponse.json(data, { status: 200 });
    }

    const normalized = (data as unknown[]).map((row) => {
      if (!row || typeof row !== "object") {
        return {
          query: null,
          filters_used: "{}",
          search_count: 0,
          unique_users: 0,
          unique_sessions: 0,
        } satisfies CompanySearchedRow;
      }
      const r = row as Record<string, unknown>;
      return {
        query: typeof r.query === "string" ? r.query : null,
        filters_used: typeof r.filters_used === "string" ? r.filters_used : "{}",
        search_count: Number(r.search_count) || 0,
        unique_users: Number(r.unique_users) || 0,
        unique_sessions: Number(r.unique_sessions) || 0,
      } satisfies CompanySearchedRow;
    });

    return NextResponse.json(normalized, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

