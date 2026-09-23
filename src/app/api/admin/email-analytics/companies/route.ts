import { getAnalyticsCompanies } from "@/lib/email-service";
import { requireAuthUser } from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  try {
    const data = await getAnalyticsCompanies();
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream error";
    return Response.json({ error: message }, { status: 502 });
  }
}
