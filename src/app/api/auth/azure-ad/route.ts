import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  AZURE_OAUTH_STATE_COOKIE,
  buildAzureAuthorizeUrl,
  isProduction,
} from "@/lib/azureSsoServer";

export async function GET(req: NextRequest) {
  try {
    const state = crypto.randomBytes(16).toString("hex");
    const authorizeUrl = buildAzureAuthorizeUrl(state);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(AZURE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Azure SSO start failed:", error);
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "azure_config");
    return NextResponse.redirect(url);
  }
}
