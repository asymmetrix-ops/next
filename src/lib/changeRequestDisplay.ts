/** Shared types & parsers for Xano `change_request` rows (admin Change detection). */

export type ChangeRequestItem = {
  id: number;
  created_at: number;
  data?: {
    type?: string;
    title?: string;
    message?: string;
    [key: string]: unknown;
  };
  bucket?: string;
  skip_reason?: string | null;
  watch_url?: string;
  added_text?: string;
  removed_text?: string;
  ai_reasoning?: unknown;
};

export type ChangeRequestResponse = {
  items?: ChangeRequestItem[];
  total?: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
  next_page?: number | null;
};

export function parseChangeMessageMeta(item: ChangeRequestItem): {
  watch_title?: string;
  watch_uuid?: string;
  diff_url?: string;
  change_datetime?: string;
  watch_tag?: string;
} {
  const raw = item.data?.message;
  if (typeof raw !== "string") return {};
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    return {
      watch_title:
        typeof j.watch_title === "string" ? j.watch_title : undefined,
      watch_uuid:
        typeof j.watch_uuid === "string" ? j.watch_uuid : undefined,
      diff_url: typeof j.diff_url === "string" ? j.diff_url : undefined,
      change_datetime:
        typeof j.change_datetime === "string" ? j.change_datetime : undefined,
      watch_tag: typeof j.watch_tag === "string" ? j.watch_tag : undefined,
    };
  } catch {
    return {};
  }
}

export function formatChangeRequestTime(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? String(ms) : d.toLocaleString();
}

export function getChangeRequestDiffText(
  item: ChangeRequestItem,
  key: "added_text" | "removed_text"
): string | undefined {
  const top = item[key];
  if (typeof top === "string" && top.length > 0) return top;
  const d = item.data;
  if (d && typeof d === "object" && key in d) {
    const v = (d as Record<string, unknown>)[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return typeof top === "string" ? top : undefined;
}

export function getChangeRequestAiReasoning(item: ChangeRequestItem): unknown {
  if (item.ai_reasoning != null && item.ai_reasoning !== "") {
    return item.ai_reasoning;
  }
  const d = item.data;
  if (d && typeof d === "object" && "ai_reasoning" in d) {
    return (d as Record<string, unknown>).ai_reasoning;
  }
  return undefined;
}

/** Split plain diff strings into line items for the DiffBlock UI. */
export type DiffItem = {
  label: string;
  dim?: boolean;
  highlight?: boolean;
  strike?: boolean;
  muted?: boolean;
};

const DIFF_SEGMENT_SOFT_MAX = 340;

/** Break huge single-line dumps (camelCase language lists, etc.) into readable lines. */
function splitDenseSegment(s: string): string[] {
  const t = s.trim();
  if (!t) return [];
  if (t.length <= DIFF_SEGMENT_SOFT_MAX) return [t];

  const bySentence = t.split(/(?<=[.!?])\s+(?=[\w*"'(])/);
  if (bySentence.length > 1) {
    return bySentence.flatMap((x) => splitDenseSegment(x.trim()));
  }

  const decamel = t.replace(/([a-z\d])([A-Z])/g, "$1 $2");
  if (decamel !== t) {
    const words = decamel.split(/\s+/).filter(Boolean);
    if (words.length > 8) {
      const lines: string[] = [];
      let buf: string[] = [];
      for (const w of words) {
        buf.push(w);
        const line = buf.join(" ");
        if (line.length >= 88 || buf.length >= 16) {
          lines.push(line);
          buf = [];
        }
      }
      if (buf.length) lines.push(buf.join(" "));
      return lines;
    }
  }

  const hard: string[] = [];
  for (let i = 0; i < t.length; i += DIFF_SEGMENT_SOFT_MAX) {
    hard.push(t.slice(i, i + DIFF_SEGMENT_SOFT_MAX));
  }
  return hard;
}

function segmentDiffText(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  let parts = t
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1 && t.length > 120) {
    const byDouble = t
      .split(/\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (byDouble.length > 4) parts = byDouble;
  }
  parts = parts.flatMap((p) => splitDenseSegment(p));
  return parts.length ? parts : [t];
}

function isCookieOrUiNoise(label: string): boolean {
  const L = label.trim();
  if (L.length < 24) return false;
  return (
    /this website stores cookies/i.test(L) ||
    /if you decline, your information/i.test(L) ||
    /^\* Select Language/i.test(L) ||
    (L.length > 400 &&
      /language(abkhaz|acehnese|afrikaans)/i.test(L) &&
      /[a-z][A-Z]/.test(L))
  );
}

export function textToDiffItems(
  text: string | undefined,
  variant: "added" | "removed"
): DiffItem[] {
  if (!text?.trim()) return [];
  const segments = segmentDiffText(text);
  const isAdded = variant === "added";
  const lengths = segments.map((s) => s.length);
  const maxLen = Math.max(0, ...lengths);
  let highlightIdx = -1;
  if (isAdded) {
    const scored = segments.map((label, i) => {
      const muted = isMutedLine(label) || isCookieOrUiNoise(label);
      if (muted) return { i, score: -1 };
      const kw =
        /\b(acquir|merger|mergers|announc|acquisition|partnership|integrat|launch|launching)\b/i.test(
          label
        );
      const score = (label.length === maxLen ? 2 : 0) + (kw ? 3 : 0);
      return { i, score };
    });
    const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
    if (best.score > 0) highlightIdx = best.i;
  }

  return segments.map((label, i) => {
    const lower = label.toLowerCase();
    const muted =
      /\* < previous|^\* < previous/i.test(label) ||
      lower.includes("acceptdecline") ||
      (label.length < 8 && /^[\*•]+$/.test(label.trim())) ||
      isCookieOrUiNoise(label);
    const dim =
      !muted &&
      (/(^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})$/i.test(
        label
      ) ||
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}$/i.test(
          label
        ) ||
        (/^[A-Za-z]+$/.test(label) && label.length <= 12 && i < 4));
    const highlight = isAdded && i === highlightIdx && !muted;
    const strike = !isAdded && !muted && !dim;
    return {
      label,
      ...(muted ? { muted: true } : {}),
      ...(dim ? { dim: true } : {}),
      ...(highlight ? { highlight: true } : {}),
      ...(strike ? { strike: true } : {}),
    };
  });
}

function isMutedLine(label: string): boolean {
  return /\* < previous/i.test(label) || /^[\s\*•]+previous$/i.test(label);
}

export function formatAiReasoningCard(raw: unknown): {
  title: string;
  body: string;
  tags: string[];
} | null {
  if (raw == null || raw === "") return null;
  let value: unknown = raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      value = JSON.parse(t) as unknown;
    } catch {
      return { title: "", body: raw, tags: [] };
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, unknown>;
  const signalLine =
    typeof o.signal_line === "string" ? o.signal_line.trim() : "";
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const reason = typeof o.reason === "string" ? o.reason.trim() : "";
  const dealType = typeof o.deal_type === "string" ? o.deal_type.trim() : "";
  const confidence =
    typeof o.confidence === "string" ? o.confidence.trim() : "";
  const isRel = typeof o.is_relevant === "boolean" ? o.is_relevant : undefined;
  const shouldSkip =
    typeof o.should_skip === "boolean" ? o.should_skip : undefined;

  const title =
    signalLine ||
    (summary ? summary.slice(0, 160) : "") ||
    (reason ? reason.slice(0, 160) : "");
  const bodyParts: string[] = [];
  if (summary) bodyParts.push(summary);
  if (reason && reason !== summary) bodyParts.push(reason);
  const body = bodyParts.join("\n\n");

  const tags: string[] = [];
  if (dealType) tags.push(dealType);
  if (confidence) tags.push(confidence);
  if (isRel !== undefined) tags.push(`relevant: ${isRel ? "yes" : "no"}`);
  if (shouldSkip !== undefined)
    tags.push(`skip: ${shouldSkip ? "yes" : "no"}`);

  if (!title.trim() && !body.trim() && tags.length === 0) return null;
  return { title: title.trim() || "—", body, tags };
}

export function splitCreatedForDisplay(
  item: ChangeRequestItem,
  meta: ReturnType<typeof parseChangeMessageMeta>
): { line1: string; line2: string } {
  if (meta.change_datetime) {
    const s = meta.change_datetime.trim();
    const sp = s.split(/\s+/);
    if (sp.length >= 2) {
      return {
        line1: sp.slice(0, 2).join(" "),
        line2: sp.slice(2).join(" ") || "",
      };
    }
    return { line1: s, line2: "" };
  }
  const full = formatChangeRequestTime(item.created_at);
  const idx = full.indexOf(", ");
  if (idx === -1) return { line1: full, line2: "" };
  return {
    line1: full.slice(0, idx).trim(),
    line2: full.slice(idx + 2).trim(),
  };
}
