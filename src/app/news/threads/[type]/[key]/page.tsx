"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import NewsCard from "@/components/news/NewsCard";
import "@/components/news/news.css";
import type { NewsArticle } from "@/lib/news";
import {
  THREAD_TYPE_SINGULAR,
  fetchThread,
  isThreadType,
  threadProfileHref,
  type ThreadInfo,
} from "@/lib/newsThreads";

export default function NewsThreadPage() {
  const params = useParams<{ type: string; key: string }>();
  const type = params.type;
  const key = decodeURIComponent(params.key ?? "");
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isThreadType(type)) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchThread(type, key, controller.signal)
      .then((res) => {
        setThread(res.thread);
        setItems(res.items);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not load thread");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [type, key]);

  const profileHref = thread ? threadProfileHref(thread.type, thread.key, thread.profile_id) : null;

  return (
    <AppShell>
      <div className="min-h-screen" style={{ width: "100%", background: "#F5F7FD" }}>
        <div className="nw-shell">
          <div className="nw-head">
            <div>
              <p className="nw-eyebrow">
                Thread{thread ? ` · ${THREAD_TYPE_SINGULAR[thread.type]}` : ""}
              </p>
              <h1 className="nw-title">
                {thread?.name ?? "Thread"}
                {thread && (
                  <span className="nw-title-count">
                    {items.length} {items.length === 1 ? "article" : "articles"}
                  </span>
                )}
              </h1>
            </div>
            <div className="nw-actions">
              {profileHref && (
                <Link href={profileHref} className="nw-btn nw-btn-outline">
                  View profile
                </Link>
              )}
              <Link href="/news/threads" className="nw-btn nw-btn-outline">
                ← All threads
              </Link>
            </div>
          </div>

          {error && <div className="nw-error" role="alert">{error}</div>}

          {loading ? (
            <div className="nw-feed" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="nw-skel" key={i} style={{ minHeight: 180 }} />
              ))}
            </div>
          ) : !thread || items.length === 0 ? (
            !error && <div className="nw-state">No articles in this thread yet.</div>
          ) : (
            <div className="nw-feed">
              {items.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </AppShell>
  );
}
