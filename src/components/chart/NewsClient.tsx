"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface NewsArticle {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: string;
  published_at?: string;
}

interface NewsData {
  news: NewsArticle[];
}

function timeAgo(publishTime: string) {
  const publishDate = new Date(publishTime);
  const now = new Date();

  const diffInMinutes = Math.floor(
    (now.getTime() - publishDate.getTime()) / (1000 * 60)
  );
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else {
    return `${diffInDays} days ago`;
  }
}

export default function NewsClient({ ticker }: { ticker: string }) {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/stock/news?ticker=${ticker}`);
        if (!response.ok) throw new Error("Failed to fetch news data");
        const data = await response.json();

        setNewsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-500">
        Loading news...
      </div>
    );
  }

  if (error) {
    return null;
  }

  const url = `https://uk.finance.yahoo.com/quote/${ticker}`;

  return (
    <div className="w-4/5">
      {!newsData || newsData.news.length === 0 ? (
        <div className="py-4 text-center text-sm font-medium text-muted-foreground">
          No Recent Stories
        </div>
      ) : (
        <>
          <Link
            href={url}
            prefetch={false}
            className="group flex w-fit flex-row items-center gap-2 pb-4 text-sm font-medium text-blue-500"
          >
            See More Data from Yahoo Finance
            <i>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </i>
          </Link>
          <div className="flex flex-col gap-2">
            {newsData.news.map((article) => (
              <Link
                key={article.uuid}
                href={article.link}
                prefetch={false}
                className="flex flex-col gap-1"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {article.publisher} - {timeAgo(article.providerPublishTime)}
                </span>
                <span className="font-semibold">{article.title}</span>
                {article.published_at && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {article.published_at}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
