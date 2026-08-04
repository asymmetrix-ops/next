import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizeUrl,
  getGoogleSsoConfigStatus,
  isProduction,
} from "@/lib/googleSsoServer";

export async function GET(req: NextRequest) {
  try {
    const state = crypto.randomBytes(16).toString("hex");
    const authorizeUrl = buildGoogleAuthorizeUrl(state, req.url);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Google SSO start failed:", error);
    const url = new URL("/login", req.url);
    const status = getGoogleSsoConfigStatus();
    url.searchParams.set(
      "error",
      status.missing.length > 0
        ? `google_config:${status.missing.join(",")}`
        : "google_config"
    );
    return NextResponse.redirect(url);
  }
}
