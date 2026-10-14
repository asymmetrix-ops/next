"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeHtmlEntities } from "@/lib/contentArticleDisplay";
import { fetchSearchSuggestions, type NewsFilter, type SuggestionEntity } from "@/lib/news";

type Item =
  | { group: string; key: string; label: string; count?: number; filter: NewsFilter }
  | { group: string; key: string; label: string; articleId: number };

type Props = {
  onApplyFilter: (filter: NewsFilter) => void;
};

export default function NewsSearchBar({ onApplyFilter }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const s = await fetchSearchSuggestions(q, ac.signal);
        if (ac.signal.aborted) return;
        const entity = (rows: SuggestionEntity[], group: string, kind: "company" | "investor" | "sector"): Item[] =>
          rows.map((r) => ({
            group,
            key: `${kind}-${r.id}`,
            label: r.name,
            count: r.article_count,
            filter: { kind, id: r.id, label: r.name },
          }));
        setItems([
          ...entity(s.companies, "Companies", "company"),
          ...entity(s.investors, "Investors", "investor"),
          ...entity(s.sectors, "Sectors", "sector"),
          ...s.articles.map((a): Item => ({
            group: "Articles",
            key: `article-${a.id}`,
            label: decodeHtmlEntities(a.Headline),
            articleId: a.id,
          })),
        ]);
        setActive(-1);
      } catch {
        if (!ac.signal.aborted) setItems([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const grouped = useMemo(() => {
    const order = ["Companies", "Investors", "Sectors", "Articles"];
    return order
      .map((g) => ({ group: g, rows: items.filter((i) => i.group === g) }))
      .filter((g) => g.rows.length > 0);
  }, [items]);

  const flat = useMemo(() => grouped.flatMap((g) => g.rows), [grouped]);

  const choose = (item: Item) => {
    setOpen(false);
    if ("articleId" in item) {
      router.push(`/article/${item.articleId}`);
      return;
    }
    setQuery("");
    onApplyFilter(item.filter);
  };

  const submitText = () => {
    if (!q) return;
    setOpen(false);
    setQuery("");
    onApplyFilter({ kind: "text", label: q });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && flat[active]) choose(flat[active]);
      else submitText();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && q.length >= 2;

  return (
    <div className="nw-search" ref={wrapRef}>
      <div className="nw-search-pill">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="nw-suggest"
          aria-label="Search news"
          placeholder="Search news by company, investor, sector or title…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {showPanel && (
        <div className="nw-suggest" id="nw-suggest" role="listbox">
          {grouped.map((g) => (
            <div className="nw-suggest-group" key={g.group}>
              <div className="nw-suggest-label">{g.group}</div>
              {g.rows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  role="option"
                  aria-selected={flat[active]?.key === row.key}
                  data-active={flat[active]?.key === row.key}
                  className="nw-suggest-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(row)}
                >
                  {row.label}
                  {"count" in row && row.count ? <span className="nw-suggest-count"> · {row.count}</span> : null}
                </button>
              ))}
            </div>
          ))}
          {flat.length === 0 && (
            <div className="nw-suggest-empty">{loading ? "Searching…" : `No matches for “${q}”. Press Enter to search titles.`}</div>
          )}
        </div>
      )}
    </div>
  );
}
