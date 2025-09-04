import type { Metadata, ResolvingMetadata } from "next";

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

async function fetchSectorMeta(
  id: string
): Promise<{ name?: string; thesis?: string } | null> {
  try {
    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Get_Sector?Sector_id=${encodeURIComponent(
      id
    )}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const sector = data?.Sector;
    return {
      name: sector?.sector_name as string | undefined,
      thesis: sector?.Sector_thesis as string | undefined,
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
  const title = sectorName
    ? `Asymmetrix – ${sectorName} Sector`
    : "Sector | Asymmetrix";
  const description = sectorName
    ? `Companies and insights for the ${sectorName} sector on Asymmetrix.`
    : "Sector profile on Asymmetrix.";

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
