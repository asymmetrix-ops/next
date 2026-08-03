import { NextResponse } from "next/server";
import {
  DEFAULT_XANO_AZURE_SSO_CALLBACK_URL,
  getAzureSsoCallbackUrl,
  getAzureSsoConfigStatus,
} from "@/lib/azureSsoServer";

export async function GET() {
  const status = getAzureSsoConfigStatus();

  return NextResponse.json({
    configured: status.configured,
    missing: status.missing,
    present: status.present,
    redirectUri: process.env.AZURE_AD_REDIRECT_URI?.trim() || null,
    xanoCallbackUrl: getAzureSsoCallbackUrl(),
    defaultXanoCallbackUrl: DEFAULT_XANO_AZURE_SSO_CALLBACK_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}
