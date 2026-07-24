import { NextRequest, NextResponse } from "next/server";

const GET_LOCATION_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:8Bv5PK4I/get_location";

type LocationParts = {
  city?: string;
  state?: string;
  country?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<LocationParts> & {
      company?: string;
      website?: string;
    };

    const city = String(body.city ?? "").trim();
    const state = String(body.state ?? "").trim();
    const country = String(body.country ?? "").trim();

    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (state) params.set("state", state);
    if (country) params.set("country", country);

    const r = await fetch(`${GET_LOCATION_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: text || `Failed to lookup location (${r.status})` },
        { status: r.status }
      );
    }

    const data = (await r.json().catch(() => null)) as unknown;

    // Xano returns: { id, City, State__Province__County, Country }
    if (data && typeof data === "object") {
      const d = data as {
        id?: number;
        City?: unknown;
        State__Province__County?: unknown;
        Country?: unknown;
      };
      return NextResponse.json({
        id: typeof d.id === "number" ? d.id : undefined,
        city: typeof d.City === "string" ? d.City : "",
        state: typeof d.State__Province__County === "string" ? d.State__Province__County : "",
        country: typeof d.Country === "string" ? d.Country : "",
      });
    }

    return NextResponse.json({});
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to lookup location" },
      { status: 500 }
    );
  }
}

