import type { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

async function fetchArticleMeta(
  id: string
): Promise<{ headline?: string; strapline?: string; image?: string } | null> {
  try {
    const token = cookies().get("asymmetrix_auth_token")?.value;
    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu:develop/content/${encodeURIComponent(
      id
    )}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      headline: (data?.Headline as string | undefined) ?? undefined,
      strapline: (data?.Strapline as string | undefined) ?? undefined,
      image: (data?.image_url as string | undefined) ?? undefined,
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
  const meta = await fetchArticleMeta(id);

  const titleText = meta?.headline ?? "Insights & Analysis | Asymmetrix";
  const title = meta?.headline ? `Asymmetrix – ${meta.headline}` : titleText;
  const description = meta?.strapline || "Insights & Analysis from Asymmetrix.";

  const imageUrl = meta?.image || `${base.origin}/og-image.jpg`;
  const url = new URL(`/article/${id}`, base).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Asymmetrix",
      images: [{ url: imageUrl }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function ArticleLayout({ children }: LayoutProps) {
  return children;
}
