import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_TOKEN_COOKIE,
  AZURE_OAUTH_STATE_COOKIE,
  exchangeAzureAuthorizationCode,
  fetchAzureProfile,
  isProduction,
  syncAzureSsoWithXano,
} from "@/lib/azureSsoServer";

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
    return redirectToLogin(req, "azure_denied");
  }

  const cookieState = req.cookies.get(AZURE_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || state !== cookieState) {
    return redirectToLogin(req, "state_mismatch");
  }

  try {
    const tokens = await exchangeAzureAuthorizationCode(code, req.url);
    const accessToken = tokens.access_token?.trim();

    if (!accessToken) {
      return redirectToLogin(req, "token_exchange");
    }

    const profile = await fetchAzureProfile(accessToken);
    const email = (profile.mail || profile.userPrincipalName || "").trim();

    if (!email) {
      return redirectToLogin(req, "graph_profile");
    }

    const authToken = await syncAzureSsoWithXano({
      email,
      name: profile.displayName,
      providerUid: profile.id,
    });

    const response = NextResponse.redirect(new URL("/auth/sso-complete", req.url));
    response.cookies.set(AUTH_TOKEN_COOKIE, authToken, {
      httpOnly: false,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 60,
      path: "/",
    });
    response.cookies.delete(AZURE_OAUTH_STATE_COOKIE);

    return response;
  } catch (error) {
    const knownErrors = new Set(["token_exchange", "graph_profile", "sso_sync"]);
    const code =
      error instanceof Error && knownErrors.has(error.message)
        ? error.message
        : "sso_sync";

    return redirectToLogin(req, code);
  }
}
