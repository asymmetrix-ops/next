import { NextRequest } from "next/server";
import { getDailyAnalytics } from "@/lib/email-service";
import { requireAuthUser } from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const companyIdRaw = searchParams.get("company_id");
  const companyId = companyIdRaw ? Number.parseInt(companyIdRaw, 10) : undefined;

  try {
    const data = await getDailyAnalytics({
      date: searchParams.get("date") ?? undefined,
      timezone: searchParams.get("timezone") ?? "Europe/London",
      period: searchParams.get("period") ?? undefined,
      item_type: searchParams.get("item_type") ?? undefined,
      company_id:
        companyId != null && Number.isFinite(companyId) && companyId > 0
          ? companyId
          : undefined,
    });
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream error";
    return Response.json({ error: message }, { status: 502 });
  }
}
