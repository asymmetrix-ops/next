"use client";

import Link from "next/link";

export interface ArticleFollowOnRef {
  id: number;
  headline: string;
}

/** `follow_on` from GET content/{id}: null unless the article is a follow-on. */
export interface ArticleFollowOn {
  original: ArticleFollowOnRef | null;
  parent: ArticleFollowOnRef | null;
}

export interface ArticleStoryPart {
  id: number;
  headline: string;
  publication_date: string;
  follow_up_to: number | null;
  is_current: boolean;
}

/** `story` from GET content/{id}: null when the story has fewer than two available articles. */
export interface ArticleStory {
  parts: ArticleStoryPart[];
}

function formatStoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "Follow-on from: <original story>" line above the headline. */
export function ArticleFollowOnLine({ followOn }: { followOn?: ArticleFollowOn | null }) {
  // An unpublished original or parent comes back as null: show nothing.
  if (!followOn?.original || !followOn.parent) return null;
  const { original } = followOn;
  return (
    <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4b5563" }}>
      Follow-on from:{" "}
      <Link href={`/article/${original.id}`} style={{ color: "#2563eb", textDecoration: "underline" }}>
        {original.headline}
      </Link>
    </p>
  );
}

/** Story box listing every article of the story in date order, current one highlighted. */
export function ArticleStoryBox({ story }: { story?: ArticleStory | null }) {
  if (!story?.parts?.length) return null;
  return (
    <nav
      aria-label="Story"
      style={{
        border: "1px solid #dbeafe",
        background: "#f5f9ff",
        borderRadius: 12,
        padding: "14px 18px",
        margin: "0 0 20px",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#1d4ed8", marginBottom: 8 }}>
        Story
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {story.parts.map((part) => (
          <li key={part.id} style={{ fontSize: 14, display: "flex", gap: 10, alignItems: "baseline" }}>
            <span style={{ flex: "0 0 92px", fontSize: 12, color: "#6b7280" }}>
              {formatStoryDate(part.publication_date)}
            </span>
            {part.is_current ? (
              <span aria-current="page" style={{ fontWeight: 700, color: "#111827" }}>
                {part.headline}
              </span>
            ) : (
              <Link href={`/article/${part.id}`} style={{ color: "#2563eb", textDecoration: "underline" }}>
                {part.headline}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
