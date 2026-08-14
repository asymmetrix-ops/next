const SUBSTACK_ARCHIVE_BASE =
  "https://asymmetrixintelligence.substack.com/api/v1/archive";

const DEFAULT_THUMBNAIL = "/images/asymmetrix-video-thumbnail.png";

export type SubstackSort = "new" | "top" | "discussed";

export type SubstackPost = {
  id: number;
  headline: string;
  strapline: string;
  publicationDate: string;
  thumbnailUrl: string;
  href: string;
  contentType: string;
  coverImageIsSquare: boolean;
};

export type SubstackArchiveTabs = {
  latest: SubstackPost[];
  top: SubstackPost[];
  discussion: SubstackPost[];
};

type RawSubstackPost = {
  id?: number;
  title?: string;
  subtitle?: string;
  description?: string;
  post_date?: string;
  cover_image?: string;
  cover_image_is_square?: boolean;
  canonical_url?: string;
  postTags?: Array<{ name?: string }>;
};

function titleCaseTag(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toSubstackPost(item: RawSubstackPost): SubstackPost | null {
  if (item.id == null || !item.title?.trim() || !item.canonical_url?.trim()) {
    return null;
  }

  const tagName = item.postTags?.[0]?.name?.trim();

  return {
    id: item.id,
    headline: item.title.trim(),
    strapline: (item.subtitle || item.description || "").trim(),
    publicationDate: item.post_date?.trim() || "",
    thumbnailUrl: item.cover_image?.trim() || DEFAULT_THUMBNAIL,
    href: item.canonical_url.trim(),
    contentType: tagName ? titleCaseTag(tagName) : "Substack",
    coverImageIsSquare: Boolean(item.cover_image_is_square),
  };
}

export async function fetchSubstackArchive(
  sort: SubstackSort,
  limit = 4
): Promise<SubstackPost[]> {
  const url = `${SUBSTACK_ARCHIVE_BASE}?sort=${encodeURIComponent(sort)}&offset=0&limit=${limit}`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];

    return (data as RawSubstackPost[])
      .map(toSubstackPost)
      .filter((post): post is SubstackPost => post != null)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchSubstackArchiveTabs(
  limit = 4
): Promise<SubstackArchiveTabs> {
  const [latest, top, discussion] = await Promise.all([
    fetchSubstackArchive("new", limit),
    fetchSubstackArchive("top", limit),
    fetchSubstackArchive("discussed", limit),
  ]);

  return { latest, top, discussion };
}
