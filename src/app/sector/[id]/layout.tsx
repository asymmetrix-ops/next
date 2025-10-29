import type { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

async function fetchSectorMeta(
  id: string
): Promise<{ name?: string; thesis?: string; headline?: string } | null> {
  try {
    const token = cookies().get("asymmetrix_auth_token")?.value;
    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Get_Sector?Sector_id=${encodeURIComponent(
      id
    )}`;
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sector = data?.Sector;

    // Fetch recent corporate events for this sector to get headline
    let headline: string | undefined;
    try {
      const eventsUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Get_Corporate_Events?Primary_sectors_ids=${encodeURIComponent(
        id
      )}&Per_page=1&Page=1`;
      const eventsRes = await fetch(eventsUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 },
      });

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        const recentEvent = eventsData?.items?.[0];
        if (recentEvent?.description) {
          headline = recentEvent.description;
        }
      }
    } catch {
      // If fetching events fails, continue without headline
    }

    return {
      name: sector?.sector_name as string | undefined,
      thesis: sector?.Sector_thesis as string | undefined,
      headline,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const base =
    (await parent).metadataBase ?? new URL("https://asymmetrix.info");
  const meta = await fetchSectorMeta(id);

  const sectorName = meta?.name;
  const headline = meta?.headline;

  const title = sectorName
    ? `Asymmetrix – ${sectorName} Sector`
    : "Sector | Asymmetrix";

  // Create description with headline if available
  let description: string;
  if (sectorName && headline) {
    // Truncate headline if too long to keep description reasonable length
    const truncatedHeadline =
      headline.length > 100 ? headline.substring(0, 100) + "..." : headline;
    description = `Asymmetrix - ${truncatedHeadline} Companies and insights for the ${sectorName} sector.`;
  } else if (sectorName) {
    description = `Companies and insights for the ${sectorName} sector on Asymmetrix.`;
  } else {
    description = "Sector profile on Asymmetrix.";
  }

  const url = new URL(`/sector/${id}`, base).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Asymmetrix",
      images: [{ url: `${base.origin}/og-image.jpg` }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${base.origin}/og-image.jpg`],
    },
  };
}

export default function SectorLayout({ children }: LayoutProps) {
  return children;
}
