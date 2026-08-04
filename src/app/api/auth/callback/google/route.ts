import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_TOKEN_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleAuthorizationCode,
  fetchGoogleProfile,
  isProduction,
  syncGoogleSsoWithXano,
} from "@/lib/googleSsoServer";

function redirectToLogin(req: NextRequest, error: string): NextResponse {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return redirectToLogin(req, "google_denied");
  }

  const cookieState = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || state !== cookieState) {
    return redirectToLogin(req, "state_mismatch");
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code, req.url);
    const accessToken = tokens.access_token?.trim();

    if (!accessToken) {
      return redirectToLogin(req, "token_exchange");
    }

    const profile = await fetchGoogleProfile(accessToken);
    const email = profile.email?.trim();

    if (!email) {
      return redirectToLogin(req, "google_profile");
    }

    const authToken = await syncGoogleSsoWithXano({
      email,
      name:
        profile.name?.trim() ||
        [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim(),
      providerUid: profile.sub,
      hostedDomain: profile.hd || "",
    });

    const response = NextResponse.redirect(new URL("/auth/sso-complete", req.url));
    response.cookies.set(AUTH_TOKEN_COOKIE, authToken, {
      httpOnly: false,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 60,
      path: "/",
    });
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);

    return response;
  } catch (error) {
    const knownErrors = new Set([
      "token_exchange",
      "google_profile",
      "sso_sync",
    ]);
    const code =
      error instanceof Error && knownErrors.has(error.message)
        ? error.message
        : "sso_sync";

    return redirectToLogin(req, code);
  }
}
