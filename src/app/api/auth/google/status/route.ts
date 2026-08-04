import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_XANO_GOOGLE_SSO_CALLBACK_URL,
  getGoogleRedirectUri,
  getGoogleSsoCallbackUrl,
  getGoogleSsoConfigStatus,
} from "@/lib/googleSsoServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = getGoogleSsoConfigStatus();
  const effectiveRedirectUri = getGoogleRedirectUri(req.url);

  return NextResponse.json({
    configured: status.configured,
    missing: status.missing,
    present: status.present,
    debug: status.debug,
    envKeys: Object.keys(process.env)
      .filter((key) => key.includes("GOOGLE") || key.includes("AZURE"))
      .sort(),
    redirectUriFromEnv: process.env.GOOGLE_REDIRECT_URI?.trim() || null,
    effectiveRedirectUri,
    xanoCallbackUrl: getGoogleSsoCallbackUrl(),
    defaultXanoCallbackUrl: DEFAULT_XANO_GOOGLE_SSO_CALLBACK_URL,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
