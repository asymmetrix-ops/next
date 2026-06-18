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
  /** Optional companies array (some endpoints attach this at the top level). */
  companies?: unknown;
  /** Company names detected in the diff but not matched to the database. */
  companies_not_in_db?: unknown;
  /** Whether this change request has been reviewed (admin). */
  reviewed?: boolean;
  /** Deal detection signals from AI pipeline. */
  deal_signals?: unknown;
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

/** Bucket on row or nested under `data` (e.g. `get_change_state_all`). */
export function getChangeRequestBucket(
  item: ChangeRequestItem
): string | undefined {
  if (typeof item.bucket === "string" && item.bucket.trim() !== "") {
    return item.bucket;
  }
  const d = item.data;
  if (d && typeof d === "object" && "bucket" in d) {
    const b = (d as Record<string, unknown>).bucket;
    if (typeof b === "string" && b.trim() !== "") return b;
  }
  return undefined;
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

export type ChangeRequestCompanyRef = {
  id: number;
  name: string;
  primary_business_focus_id?: number[];
};

export type ChangeRequestDealSignal = {
  detected: boolean;
  deal_type: string | null;
  confidence: string | null;
  summary: string | null;
};

export type ChangeRequestTriState = "yes" | "maybe" | "no";

export type ChangeRequestReviewStatus = "High" | "Review" | "Skip";

export type ChangeRequestDealTagVariant = "yes" | "maybe" | "no";

export type ChangeRequestDealTag = {
  label: string;
  variant: ChangeRequestDealTagVariant;
};

const DA_PRIMARY_BUSINESS_FOCUS_ID = 75;

function coerceNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const nums = value
    .map((x) => {
      if (typeof x === "number" && Number.isFinite(x)) return x;
      if (typeof x === "string") {
        const n = parseInt(x, 10);
        return Number.isFinite(n) ? n : NaN;
      }
      return NaN;
    })
    .filter((n) => Number.isFinite(n));
  return nums.length ? nums : undefined;
}

function coerceDealSignalsArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    try {
      const parsed = JSON.parse(t) as unknown;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function coerceDealSignalEntry(value: unknown): ChangeRequestDealSignal | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const detected = o.detected === true;
  const deal_type =
    typeof o.deal_type === "string" ? o.deal_type.trim() || null : null;
  const confidence =
    typeof o.confidence === "string" ? o.confidence.trim() || null : null;
  const summary =
    typeof o.summary === "string" ? o.summary.trim() || null : null;
  return { detected, deal_type, confidence, summary };
}

export function getChangeRequestDealSignals(
  item: ChangeRequestItem
): ChangeRequestDealSignal[] {
  const candidates: unknown[] = [];
  if (item.deal_signals != null) candidates.push(item.deal_signals);
  const d = item.data;
  if (d && typeof d === "object" && "deal_signals" in d) {
    candidates.push((d as Record<string, unknown>).deal_signals);
  }

  for (const raw of candidates) {
    const arr = coerceDealSignalsArray(raw);
    if (!arr?.length) continue;
    const mapped = arr
      .map(coerceDealSignalEntry)
      .filter((x): x is ChangeRequestDealSignal => Boolean(x));
    if (mapped.length) return mapped;
  }

  return [];
}

export function getChangeRequestDealLevel(
  item: ChangeRequestItem
): ChangeRequestTriState {
  const signals = getChangeRequestDealSignals(item);
  const first = signals[0];
  if (!first || first.detected !== true) return "no";
  const conf = (first.confidence ?? "").toLowerCase();
  if (conf === "low") return "maybe";
  return "yes";
}

export function getChangeRequestDaLevel(
  item: ChangeRequestItem,
  companies?: ChangeRequestCompanyRef[]
): ChangeRequestTriState {
  const matched = companies ?? getChangeRequestCompanies(item);
  if (
    matched.some((c) =>
      c.primary_business_focus_id?.includes(DA_PRIMARY_BUSINESS_FOCUS_ID)
    )
  ) {
    return "yes";
  }
  const notInDb = getChangeRequestCompaniesNotInDb(item);
  if (notInDb.some((c) => c.verdict === "da")) return "yes";
  if (notInDb.some((c) => c.verdict === "maybe_da")) return "maybe";
  return "no";
}

/** da=yes + deal=yes → High; da=no + deal=no → Skip; otherwise Review. */
export function applyChangeRequestStatusMatrix(
  da: ChangeRequestTriState,
  deal: ChangeRequestTriState
): ChangeRequestReviewStatus {
  if (da === "yes" && deal === "yes") return "High";
  if (da === "no" && deal === "no") return "Skip";
  return "Review";
}

export function getChangeRequestReviewStatus(
  item: ChangeRequestItem
): ChangeRequestReviewStatus {
  return applyChangeRequestStatusMatrix(
    getChangeRequestDaLevel(item),
    getChangeRequestDealLevel(item)
  );
}

export function getChangeRequestDealTag(
  item: ChangeRequestItem
): ChangeRequestDealTag {
  const level = getChangeRequestDealLevel(item);
  if (level === "yes") return { label: "Deal: Yes", variant: "yes" };
  if (level === "maybe") return { label: "Deal: Maybe", variant: "maybe" };
  return { label: "Deal: No", variant: "no" };
}

export const CHANGE_REQUEST_REVIEW_STATUS_ORDER: Record<
  ChangeRequestReviewStatus,
  number
> = {
  High: 0,
  Review: 1,
  Skip: 2,
};

function coerceCompaniesArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    try {
      const parsed = JSON.parse(t) as unknown;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function getChangeRequestCompanies(
  item: ChangeRequestItem
): ChangeRequestCompanyRef[] {
  const candidates: unknown[] = [];
  const topCompanies = coerceCompaniesArray(item.companies);
  if (topCompanies) candidates.push(topCompanies);
  const d = item.data;
  if (d && typeof d === "object" && "companies" in d) {
    const v = (d as Record<string, unknown>).companies;
    const nestedCompanies = coerceCompaniesArray(v);
    if (nestedCompanies) candidates.push(nestedCompanies);
  }

  for (const arr of candidates) {
    if (!Array.isArray(arr)) continue;
    const mapped = arr
      .map((c) => {
        if (!c || typeof c !== "object") return null;
        const o = c as Record<string, unknown>;
        const idRaw = o.id;
        const nameRaw = o.name;
        const idNum =
          typeof idRaw === "number"
            ? idRaw
            : typeof idRaw === "string"
              ? parseInt(idRaw, 10)
              : NaN;
        const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
        if (!Number.isFinite(idNum) || idNum <= 0 || !name) return null;
        const focusRaw =
          o.primary_business_focus_id ?? o.Primary_Business_Focus_Id;
        const primary_business_focus_id = coerceNumberArray(focusRaw);
        return {
          id: idNum,
          name,
          ...(primary_business_focus_id
            ? { primary_business_focus_id }
            : {}),
        } satisfies ChangeRequestCompanyRef;
      })
      .filter((x): x is ChangeRequestCompanyRef => Boolean(x));
    if (mapped.length) return mapped;
  }

  return [];
}

export type ChangeRequestCompanyNotInDb = {
  company_name: string | null;
  website: string | null;
  verdict: string | null;
  confidence: string | null;
  reasoning: string | null;
};

function coerceStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const names = value
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    return names.length ? names : null;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    try {
      const parsed = JSON.parse(t) as unknown;
      return coerceStringArray(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

function coerceCompanyNotInDbArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    try {
      const parsed = JSON.parse(t) as unknown;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function coerceCompanyNotInDbEntry(
  value: unknown
): ChangeRequestCompanyNotInDb | null {
  if (typeof value === "string") {
    const name = value.trim();
    if (!name) return null;
    return {
      company_name: name,
      website: null,
      verdict: null,
      confidence: null,
      reasoning: null,
    };
  }
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const company_name =
    typeof o.company_name === "string" ? o.company_name.trim() || null : null;
  const website =
    typeof o.website === "string" ? o.website.trim() || null : null;
  const verdict =
    typeof o.verdict === "string" ? o.verdict.trim().toLowerCase() || null : null;
  const confidence =
    typeof o.confidence === "string" ? o.confidence.trim() || null : null;
  const reasoning =
    typeof o.reasoning === "string" ? o.reasoning.trim() || null : null;

  if (!company_name && !website && !verdict && !confidence && !reasoning) {
    return null;
  }

  return { company_name, website, verdict, confidence, reasoning };
}

function sortCompaniesNotInDb(
  entries: ChangeRequestCompanyNotInDb[]
): ChangeRequestCompanyNotInDb[] {
  const rank = (verdict: string | null) => {
    if (verdict === "da") return 0;
    if (verdict === "not_da") return 1;
    return 2;
  };
  return [...entries].sort((a, b) => rank(a.verdict) - rank(b.verdict));
}

export function getChangeRequestCompaniesNotInDb(
  item: ChangeRequestItem
): ChangeRequestCompanyNotInDb[] {
  const candidates: unknown[] = [];
  if (item.companies_not_in_db != null) {
    candidates.push(item.companies_not_in_db);
  }
  const d = item.data;
  if (d && typeof d === "object" && "companies_not_in_db" in d) {
    candidates.push((d as Record<string, unknown>).companies_not_in_db);
  }

  for (const raw of candidates) {
    const arr = coerceCompanyNotInDbArray(raw);
    if (arr?.length) {
      const mapped = arr
        .map(coerceCompanyNotInDbEntry)
        .filter((x): x is ChangeRequestCompanyNotInDb => Boolean(x));
      if (mapped.length) return sortCompaniesNotInDb(mapped);
    }

    const legacyNames = coerceStringArray(raw);
    if (legacyNames?.length) {
      return sortCompaniesNotInDb(
        legacyNames.map((name) => ({
          company_name: name,
          website: null,
          verdict: null,
          confidence: null,
          reasoning: null,
        }))
      );
    }
  }

  return [];
}

export function getCompanyNotInDbDisplayName(
  entry: ChangeRequestCompanyNotInDb
): string {
  if (entry.company_name) return entry.company_name;
  if (entry.website) {
    try {
      return new URL(entry.website).hostname.replace(/^www\./, "");
    } catch {
      return entry.website;
    }
  }
  return "Unknown company";
}

export function formatCompanyNotInDbVerdict(
  verdict: string | null
): string | null {
  if (!verdict) return null;
  if (verdict === "da") return "D&A";
  if (verdict === "not_da") return "Not D&A";
  return verdict.replace(/_/g, " ").toUpperCase();
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
