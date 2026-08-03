import { NextRequest, NextResponse } from "next/server";
import {
  buildAzureAuthorizeUrl,
  createSsoState,
  getAzureSsoConfig,
  setAzureSsoCookies,
} from "@/lib/azureSsoServer";

function redirectToLogin(message: string): NextResponse {
  const url = new URL("/login", requestOrigin());
  url.searchParams.set("sso_error", message);
  return NextResponse.redirect(url);
}

function requestOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return configured.replace(/\/$/, "") || "http://localhost:3001";
}

export async function GET(request: NextRequest) {
  if (!getAzureSsoConfig()) {
    return redirectToLogin("Azure SSO is not configured");
  }

  const nextParam = request.nextUrl.searchParams.get("next")?.trim();
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/home-user";

  const state = createSsoState();
  setAzureSsoCookies(state, nextPath);

  const authorizeUrl = buildAzureAuthorizeUrl(state);
  return NextResponse.redirect(authorizeUrl);
}
