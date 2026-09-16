import { NextRequest, NextResponse } from "next/server";
import {
  isBroadcastCampaignKey,
  proxyBroadcastCampaignGet,
} from "@/lib/broadcastAnalyticsProxy";
import { requireAuthUser } from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ campaignKey: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const { campaignKey } = await context.params;
  if (!isBroadcastCampaignKey(campaignKey)) {
    return NextResponse.json({ error: "Unknown campaign" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  return proxyBroadcastCampaignGet(campaignKey, "/opened", searchParams);
}
