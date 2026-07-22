import { NextRequest, NextResponse } from "next/server";
import { MCP_GUEST_ROLE, isContributorSession, isMcpGuestSession } from "@/lib/mcpGuest";
import {
  MCP_GUEST_AUTH_API_BASE,
  MCP_GUEST_AUTH_GENERIC_ERROR,
  extractAuthToken,
  fetchMcpGuestAuthMe,
  normalizeMcpGuestEmail,
} from "@/lib/mcpGuestAuthServer";
import { isWorkEmail, WORK_EMAIL_REQUIRED_MESSAGE } from "@/lib/workEmail";

function buildOtpLoginResponse(
  token: string,
  email: string,
  data: unknown,
  user: Record<string, unknown> | null
) {
  const resolvedUser = user ?? {
    email,
    role: MCP_GUEST_ROLE,
    status: MCP_GUEST_ROLE,
    Status: MCP_GUEST_ROLE,
  };

  const base =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  return {
    ...base,
    authToken: token,
    token,
    user: resolvedUser,
  };
}

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

    if (!isWorkEmail(email)) {
      return NextResponse.json(
        { error: WORK_EMAIL_REQUIRED_MESSAGE },
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

    const token = extractAuthToken(data);
    if (!token) {
      return NextResponse.json(
        { error: MCP_GUEST_AUTH_GENERIC_ERROR },
        { status: 400 }
      );
    }

    const inlineUser =
      data && typeof data === "object" && "user" in data
        ? ((data as { user?: unknown }).user as Record<string, unknown> | null)
        : null;

    const user = inlineUser ?? (await fetchMcpGuestAuthMe(token));

    if (isContributorSession(token, user)) {
      return NextResponse.json(
        { error: MCP_GUEST_AUTH_GENERIC_ERROR },
        { status: 403 }
      );
    }

    // Xano otp_login only returns { token } — trust a successful OTP exchange
    // unless we can positively identify a blocked role (e.g. Contributor).
    if (user && !isMcpGuestSession(token, user)) {
      return NextResponse.json(
        buildOtpLoginResponse(token, email, data, {
          ...user,
          email: String(user.email ?? email),
          role: MCP_GUEST_ROLE,
          status: MCP_GUEST_ROLE,
          Status: MCP_GUEST_ROLE,
        })
      );
    }

    return NextResponse.json(buildOtpLoginResponse(token, email, data, user));
  } catch {
    return NextResponse.json(
      { error: MCP_GUEST_AUTH_GENERIC_ERROR },
      { status: 500 }
    );
  }
}
