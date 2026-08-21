import HomeUserClient from "./HomeUserClient";
import { fetchDealRadarServer } from "@/lib/dealRadarServer";
import { fetchHomeCorporateEventsServer } from "@/lib/homeCorporateEventsServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HomeUserPage() {
  const [initialDealRadar, initialCorporateEvents] = await Promise.all([
    fetchDealRadarServer({ limit: 25, offset: 0 }).catch((error) => {
      console.error("SSR deal radar fetch failed:", error);
      return null;
    }),
    fetchHomeCorporateEventsServer().catch((error) => {
      console.error("SSR home corporate events fetch failed:", error);
      return null;
    }),
  ]);

  return (
    <HomeUserClient
      initialDealRadar={initialDealRadar}
      initialCorporateEvents={initialCorporateEvents}
    />
  );
}
