import type { Metadata, ResolvingMetadata } from "next";

type LayoutProps = {
  children: React.ReactNode;
  params: { param: string };
};

async function fetchIndividualName(id: string): Promise<string | undefined> {
  try {
    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_individuals_name?individuals_id=${encodeURIComponent(
      id
    )}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return undefined;
    const data = await res.json();
    const name = data?.advisor_individuals as string | undefined;
    return name;
  } catch {
    return undefined;
  }
}

export async function generateMetadata(
  { params }: { params: { param: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.param;
  const base =
    (await parent).metadataBase ?? new URL("https://asymmetrix.info");
  const name = await fetchIndividualName(id);

  const title = name ? `Asymmetrix – ${name}` : "Individual | Asymmetrix";
  const description = name
    ? `Profile, roles, and corporate events for ${name} on Asymmetrix.`
    : "Individual profile on Asymmetrix.";

  const url = new URL(`/individual/${id}`, base).toString();

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
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${base.origin}/og-image.jpg`],
    },
  };
}

export default function IndividualLayout({ children }: LayoutProps) {
  return children;
}
