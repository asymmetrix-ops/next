import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  buildArticleJsonLd,
  buildArticleMetadata,
  fetchArticleForSeo,
} from "@/lib/articleSeo";

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const token = cookies().get("asymmetrix_auth_token")?.value;
  const article = await fetchArticleForSeo(params.id, token);
  return buildArticleMetadata(article, params.id);
}

export default async function ArticleLayout({
  children,
  params,
}: LayoutProps) {
  const token = cookies().get("asymmetrix_auth_token")?.value;
  const article = await fetchArticleForSeo(params.id, token);
  const jsonLd = article ? buildArticleJsonLd(article, params.id) : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}
