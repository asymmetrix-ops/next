const TOP_VIEWED_LANDING_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content/top-viewed/landing";

type RawTopViewedArticle = {
  Content_Type?: string;
  Headline?: string;
  time_ago?: string;
};

export type TopViewedLandingArticle = {
  tag: string;
  headline: string;
  meta: string;
  offset: boolean;
};

export async function fetchTopViewedLandingArticles(): Promise<
  TopViewedLandingArticle[]
> {
  try {
    const res = await fetch(TOP_VIEWED_LANDING_URL, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { top_articles?: unknown };
    if (!Array.isArray(data.top_articles)) return [];

    return (data.top_articles as RawTopViewedArticle[])
      .slice(0, 4)
      .map((item, index) => {
        const contentType = item.Content_Type?.trim() || "Analysis";
        const headline = item.Headline?.trim() || "Untitled article";
        const timeAgo = item.time_ago?.trim() || "";

        return {
          tag: contentType,
          headline,
          meta: timeAgo,
          offset: index === 1 || index === 2,
        };
      });
  } catch {
    return [];
  }
}
