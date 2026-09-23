import { NextRequest } from "next/server";
import { getUserAnalytics } from "@/lib/email-service";
import { requireAuthUser } from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const sortOrder =
    searchParams.get("sort_order") ?? searchParams.get("sort_dir") ?? "desc";
  const companyIdRaw = searchParams.get("company_id");
  const companyId = companyIdRaw ? Number.parseInt(companyIdRaw, 10) : undefined;

  try {
    const data = await getUserAnalytics({
      date: searchParams.get("date") ?? undefined,
      timezone: searchParams.get("timezone") ?? "Europe/London",
      sort_by: searchParams.get("sort_by") ?? "sent_7d",
      sort_order: sortOrder === "asc" ? "asc" : "desc",
      item_type: searchParams.get("item_type") ?? undefined,
      user_id: searchParams.get("user_id") ?? undefined,
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
