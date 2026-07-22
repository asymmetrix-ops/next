import { NextRequest, NextResponse } from "next/server";
import { isMcpGuestSession } from "@/lib/mcpGuest";
import {
  MCP_GUEST_AUTH_GENERIC_ERROR,
  fetchMcpGuestAuthMe,
} from "@/lib/mcpGuestAuthServer";

function readToken(request: NextRequest): string {
  const header = request.headers.get("x-asym-token")?.trim();
  if (header) return header;

  return request.cookies.get("asymmetrix_auth_token")?.value?.trim() ?? "";
}

export async function GET(request: NextRequest) {
  try {
    const token = readToken(request);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const user = await fetchMcpGuestAuthMe(token);
    if (!user || !isMcpGuestSession(token, user)) {
      return NextResponse.json(
        { error: MCP_GUEST_AUTH_GENERIC_ERROR },
        { status: 401 }
      );
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: MCP_GUEST_AUTH_GENERIC_ERROR },
      { status: 500 }
    );
  }
}
