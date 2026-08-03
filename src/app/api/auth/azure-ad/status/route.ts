import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_XANO_AZURE_SSO_CALLBACK_URL,
  getAzureRedirectUri,
  getAzureSsoCallbackUrl,
  getAzureSsoConfigStatus,
} from "@/lib/azureSsoServer";

export async function GET(req: NextRequest) {
  const status = getAzureSsoConfigStatus();
  const effectiveRedirectUri = getAzureRedirectUri(req.url);

  return NextResponse.json({
    configured: status.configured,
    missing: status.missing,
    present: status.present,
    redirectUriFromEnv: process.env.AZURE_AD_REDIRECT_URI?.trim() || null,
    effectiveRedirectUri,
    xanoCallbackUrl: getAzureSsoCallbackUrl(),
    defaultXanoCallbackUrl: DEFAULT_XANO_AZURE_SSO_CALLBACK_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}
