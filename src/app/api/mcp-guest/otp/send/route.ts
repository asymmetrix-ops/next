import { NextRequest, NextResponse } from "next/server";
import {
  MCP_GUEST_AUTH_API_BASE,
  MCP_GUEST_AUTH_GENERIC_ERROR,
  normalizeMcpGuestEmail,
} from "@/lib/mcpGuestAuthServer";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      to?: string;
      email?: string;
    } | null;

    const to = normalizeMcpGuestEmail(body?.to ?? body?.email ?? "");
    if (!to) {
      return NextResponse.json(
        { error: MCP_GUEST_AUTH_GENERIC_ERROR },
        { status: 400 }
      );
    }

    const response = await fetch(`${MCP_GUEST_AUTH_API_BASE}/otp`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: MCP_GUEST_AUTH_GENERIC_ERROR },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: MCP_GUEST_AUTH_GENERIC_ERROR },
      { status: 500 }
    );
  }
}
