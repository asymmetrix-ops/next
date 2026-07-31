import type { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

async function fetchEventTitle(id: string): Promise<string | undefined> {
  try {
    const token = cookies().get("asymmetrix_auth_token")?.value;
    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_corporate_event_title?id=${encodeURIComponent(
      id
    )}`;
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return (typeof data === "string" ? data : data?.title) as
      | string
      | undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata(
  { params }: { params: { id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const base =
    (await parent).metadataBase ?? new URL("https://asymmetrix.info");
  const titleRaw = await fetchEventTitle(id);

  const title = titleRaw
    ? `Asymmetrix – ${titleRaw}`
    : "Corporate Event | Asymmetrix";
  const description = titleRaw
    ? `Details and participants for corporate event: ${titleRaw}.`
    : "Corporate event details on Asymmetrix.";

  const url = new URL(`/corporate-event/${id}`, base).toString();

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

export default function CorporateEventLayout({ children }: LayoutProps) {
  return children;
}
