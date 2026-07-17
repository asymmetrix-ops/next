import { NextRequest, NextResponse } from "next/server";
import {
  MCP_GUEST_AUTH_API_BASE,
  MCP_GUEST_AUTH_GENERIC_ERROR,
  normalizeMcpGuestEmail,
} from "@/lib/mcpGuestAuthServer";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      otp?: string;
    } | null;

    const email = normalizeMcpGuestEmail(body?.email ?? "");
    const otp = String(body?.otp ?? "").trim();

    if (!email || !otp) {
      return NextResponse.json(
        { error: MCP_GUEST_AUTH_GENERIC_ERROR },
        { status: 400 }
      );
    }

    const response = await fetch(`${MCP_GUEST_AUTH_API_BASE}/otp_login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: MCP_GUEST_AUTH_GENERIC_ERROR },
        { status: 400 }
      );
    }

    const token =
      data &&
      typeof data === "object" &&
      ("authToken" in data || "token" in data)
        ? String(
            (data as { authToken?: unknown; token?: unknown }).authToken ??
              (data as { token?: unknown }).token ??
              ""
          )
        : "";

    if (!token) {
      return NextResponse.json(
        { error: MCP_GUEST_AUTH_GENERIC_ERROR },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: MCP_GUEST_AUTH_GENERIC_ERROR },
      { status: 500 }
    );
  }
}
