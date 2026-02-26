import type { ContentArticle } from "@/types/insightsAnalysis";
import InsightsAnalysisCard from "@/components/InsightsAnalysisCard";

type PublicArticle = {
  id: number;
  Publication_Date?: string;
  Headline?: string;
  Strapline?: string;
  // Content type fields may arrive in different shapes/keys
  Content_Type?: string;
  content_type?: string;
  Content?: { Content_type?: string; Content_Type?: string };
};

const ReportsSection = async () => {
  let items: PublicArticle[] = [];
  // Use new landing endpoint first; fall back to prior public endpoint
  try {
    const primaryRes = await fetch(
      "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/articles_landing_page",
      { next: { revalidate: 1800 } }
    );
    if (primaryRes.ok) {
      const data = (await primaryRes.json()) as unknown;
      const arr = Array.isArray(data)
        ? (data as PublicArticle[])
        : (data as { items?: unknown })?.items;
      if (Array.isArray(arr)) items = arr as PublicArticle[];
    }

    // If new endpoint empty/unavailable, try older public route
    if (!items.length) {
      const pubRes = await fetch(
        "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/All_Content_Articles_home_public",
        { next: { revalidate: 1800 } }
      );
      if (pubRes.ok) {
        const data = (await pubRes.json()) as unknown;
        if (Array.isArray(data)) items = data as PublicArticle[];
      }
    }
  } catch {
    items = [];
  }

  const list = items.slice(0, 3);

  const getContentType = (article: PublicArticle) =>
    (
      article.Content_Type ||
      article.content_type ||
      article.Content?.Content_type ||
      article.Content?.Content_Type ||
      ""
    )
      .toString()
      .trim();

  const toContentArticle = (a: PublicArticle): ContentArticle => {
    const pub = a.Publication_Date || "";
    const createdAt =
      pub && !Number.isNaN(new Date(pub).getTime())
        ? Math.floor(new Date(pub).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

    return {
      id: a.id,
      created_at: createdAt,
      Publication_Date: pub,
      Headline: a.Headline || "",
      Strapline: a.Strapline || "",
      Content_Type: getContentType(a) || undefined,
      Body: "",
      sectors: [],
      companies_mentioned: [],
      Visibility: "Public",
      Related_Documents: [],
    };
  };

  // Scoped styles to match Insights & Analysis page card/grid UI
  const style = `
    * { box-sizing: border-box; }
    .insights-analysis-section {
      padding: 32px 16px;
      border-radius: 8px;
      max-width: 100%;
      width: 100%;
      overflow-x: hidden;
      box-sizing: border-box;
    }
    @media (max-width: 640px) {
      .insights-analysis-section { padding: 16px 12px !important; }
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 24px;
      padding: 0;
      margin-bottom: 24px;
      width: 100%;
      max-width: 100%;
    }
    @media (max-width: 768px) {
      .cards-grid { grid-template-columns: 1fr; }
      .insights-analysis-section { padding: 16px 8px !important; }
    }

    .insights-analysis-section .content-card {
      display: flex !important;
      flex-direction: column !important;
      min-height: 480px !important;
      padding: 28px !important;
      box-sizing: border-box !important;
    }
    .insights-analysis-section .card-header { margin-bottom: 16px !important; }
    .insights-analysis-section .card-title {
      min-height: 0 !important;
      display: block !important;
      overflow: visible !important;
      text-overflow: unset !important;
      white-space: normal !important;
      overflow-wrap: anywhere;
      word-break: break-word;
      line-height: 1.35 !important;
    }
    .insights-analysis-section .card-body {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 16px !important;
      margin-bottom: 20px !important;
    }
    .insights-analysis-section .card-footer {
      margin-top: auto !important;
      padding-top: 20px !important;
      border-top: 1px solid #E5E7EB !important;
    }
    .insights-analysis-section .description {
      display: -webkit-box !important;
      -webkit-line-clamp: 3 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      line-height: 1.7 !important;
      padding-bottom: 2px;
      overflow-wrap: anywhere;
    }
    .insights-analysis-section .badge-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .insights-analysis-section .company-badge {
      background-color: #e8f5e8;
      color: #2e7d32;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.2;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
    }
    .insights-analysis-section .sector-badge {
      background-color: #f3e5f5;
      color: #7b1fa2;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.2;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
    }
    .insights-analysis-section .more-badge {
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.2;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
    }
    .insights-analysis-section .meta-label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .insights-analysis-section .meta-section + .meta-section { margin-top: 12px; }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  `;

  return (
    <section className="py-20 bg-asymmetrix-bg-light">
      <div className="container px-6 mx-auto">
        <h2 className="mb-10 text-4xl font-bold text-center text-gray-900">
          Recent Reports and Analysis
        </h2>

        <div className="insights-analysis-section">
          {list.length === 0 ? (
            <div className="loading">No recent content available.</div>
          ) : (
            <div className="insights-analysis-cards cards-grid">
              {list.map((article) => (
                <InsightsAnalysisCard
                  key={article.id}
                  article={toContentArticle(article)}
                  href={`/article/${article.id}?from=home`}
                  showMeta={true}
                  badgeBelowDate={true}
                  metaStyle="badges"
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </section>
  );
};

export default ReportsSection;
