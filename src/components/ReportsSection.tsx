type PublicArticle = {
  id: number;
  Publication_Date?: string;
  Headline?: string;
  Strapline?: string;
};

const ReportsSection = async () => {
  let items: PublicArticle[] = [];
  try {
    const res = await fetch(
      "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/All_Content_Articles_home_public",
      { next: { revalidate: 1800 } }
    );
    if (res.ok) {
      const data = (await res.json()) as unknown;
      items = Array.isArray(data) ? (data as PublicArticle[]) : [];
    }
  } catch {
    items = [];
  }

  const list = items.slice(0, 3);

  const formatDate = (value?: string) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return String(value);
    }
  };

  return (
    <section className="py-20 bg-asymmetrix-bg-light">
      <div className="container px-6 mx-auto">
        <h2 className="mb-16 text-4xl font-bold text-center text-gray-900">
          Recent Reports and Analysis
        </h2>

        {list.length === 0 ? (
          <p className="text-center text-gray-600">
            No recent content available.
          </p>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {list.map((article) => (
              <a
                key={article.id}
                href={`/article/${article.id}`}
                className="overflow-hidden bg-white rounded-2xl border-0 shadow-lg block"
              >
                <div className="px-4 py-2 bg-blue-100 text-asymmetrix-blue">
                  <span className="text-sm font-medium">Article</span>
                </div>
                <div className="p-6">
                  <h3 className="mb-3 text-xl font-bold leading-tight text-gray-900">
                    {article.Headline || "Untitled"}
                  </h3>
                  <p className="mb-4 text-sm text-gray-600">
                    {formatDate(article.Publication_Date)}
                  </p>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {article.Strapline || ""}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ReportsSection;
