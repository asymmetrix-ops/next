import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_TOKEN_COOKIE,
  buildAuthCookieHeader,
  clearAzureSsoCookies,
  exchangeAzureAuthorizationCode,
  exchangeAzureSsoWithXano,
  fetchAzureProfile,
  getAzureSsoConfig,
  readAzureSsoNextPath,
  readAzureSsoState,
} from "@/lib/azureSsoServer";

function redirectWithError(message: string): NextResponse {
  clearAzureSsoCookies();
  const url = new URL("/login", getPublicOrigin());
  url.searchParams.set("sso_error", message);
  return NextResponse.redirect(url);
}

function getPublicOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return configured.replace(/\/$/, "") || "http://localhost:3001";
}

export async function GET(request: NextRequest) {
  const config = getAzureSsoConfig();
  if (!config) {
    return redirectWithError("Azure SSO is not configured");
  }

  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return redirectWithError(errorDescription || error);
  }

  const code = searchParams.get("code")?.trim();
  const state = searchParams.get("state")?.trim();
  const expectedState = readAzureSsoState();

  if (!code) {
    return redirectWithError("Missing authorization code");
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithError("Invalid SSO state");
  }

  try {
    const tokenResponse = await exchangeAzureAuthorizationCode(code);
    const accessToken = tokenResponse.access_token?.trim();

    if (!accessToken) {
      throw new Error("Azure did not return an access token");
    }

    const profile = await fetchAzureProfile(accessToken);
    const { token } = await exchangeAzureSsoWithXano({
      code,
      accessToken,
      idToken: tokenResponse.id_token,
      profile,
    });

    const nextPath = readAzureSsoNextPath();
    clearAzureSsoCookies();

    const completeUrl = new URL("/auth/sso-complete", getPublicOrigin());
    completeUrl.searchParams.set("next", nextPath);

    const response = NextResponse.redirect(completeUrl);
    response.cookies.set(AUTH_TOKEN_COOKIE, token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Keep a duplicate Set-Cookie for environments that prefer raw headers.
    response.headers.append("Set-Cookie", buildAuthCookieHeader(token));

    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Azure SSO sign-in failed";
    return redirectWithError(message);
  }
}
