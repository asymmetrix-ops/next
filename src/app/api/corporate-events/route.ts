import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";
import { CE_CACHE_KEY } from "@/lib/ce-cache-key";

export const dynamic = "force-dynamic";

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

// Returns true when the request has no filters applied and matches the
// default warm-ce page (Page=1, Per_page=25, nothing else).
function isDefaultRequest(searchParams: URLSearchParams): boolean {
  const page = searchParams.get("Page") ?? "1";
  const perPage = searchParams.get("Per_page") ?? "25";

  if (page !== "1" || perPage !== "25") return false;

  // Any extra filter param means it's a filtered request — skip cache
  const ignoredKeys = new Set(["Page", "Per_page"]);
  let hasExtraKeys = false;
  searchParams.forEach((_value, key) => {
    if (!ignoredKeys.has(key)) hasExtraKeys = true;
  });
  if (hasExtraKeys) return false;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get("asymmetrix_auth_token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Serve the default first page from Redis cache when available
    if (isDefaultRequest(searchParams)) {
      const redis = getRedisClient();
      if (redis) {
        try {
          const cached = await redis.get<unknown>(CE_CACHE_KEY);
          if (cached != null) {
            console.log("[CE] ✅ Cache HIT (default page)");
            return NextResponse.json(cached);
          }
          console.log("[CE] ❌ Cache MISS (default page) — fetching live");
        } catch (e) {
          console.warn("[CE] ⚠️ Redis read failed, falling through to live fetch:", e);
        }
      }
    }

    // Build the Xano URL with all search params
    const apiUrl = new URL(
      "https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events"
    );

    const processedKeys = new Set<string>();
    searchParams.forEach((value, key) => {
      if (processedKeys.has(key)) return;
      if (key.endsWith("[]")) {
        searchParams.getAll(key).forEach((val) => apiUrl.searchParams.append(key, val));
      } else {
        apiUrl.searchParams.append(key, value);
      }
      processedKeys.add(key);
    });

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching corporate events:", error);
    return NextResponse.json(
      { error: "Failed to fetch corporate events" },
      { status: 500 }
    );
  }
}
