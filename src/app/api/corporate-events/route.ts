import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies or headers
    const cookieStore = await cookies();
    const token =
      cookieStore.get("asymmetrix_auth_token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all search params from the request URL
    const searchParams = request.nextUrl.searchParams;
    
    // Build the URL for the external API
    const apiUrl = new URL(
      "https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events"
    );

    // Copy all search params to the external API URL
    // Handle array parameters (keys ending with []) correctly
    const processedKeys = new Set<string>();
    searchParams.forEach((value, key) => {
      // Skip if we've already processed this key as an array
      if (processedKeys.has(key)) return;
      
      // Check if this is an array parameter (key ends with [])
      if (key.endsWith("[]")) {
        // Get all values for this array parameter
        const allValues = searchParams.getAll(key);
        allValues.forEach((val) => {
          apiUrl.searchParams.append(key, val);
        });
        processedKeys.add(key);
      } else {
        // Regular parameter - just append the value
        apiUrl.searchParams.append(key, value);
        processedKeys.add(key);
      }
    });

    // Make the request to the external API
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store", // Disable caching for fresh data
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

