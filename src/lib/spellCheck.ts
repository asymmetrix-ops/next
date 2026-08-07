import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export const SPELL_CHECK_BLOCK_SEPARATOR = "\n\n";

export type SpellCheckIssue = {
  offset: number;
  length: number;
  word: string;
  message: string;
  suggestions: string[];
  context: string;
};

type LanguageToolMatch = {
  offset?: number;
  length?: number;
  message?: string;
  replacements?: Array<{ value?: string }>;
  context?: { text?: string };
  rule?: { issueType?: string; category?: { id?: string } };
};

export function extractPlainText(doc: ProseMirrorNode): string {
  return doc.textBetween(0, doc.content.size, SPELL_CHECK_BLOCK_SEPARATOR);
}

export function plainTextOffsetToDocPosition(
  doc: ProseMirrorNode,
  targetOffset: number,
  blockSeparator: string = SPELL_CHECK_BLOCK_SEPARATOR
): number {
  const clamped = Math.max(0, targetOffset);
  let lo = 0;
  let hi = doc.content.size;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const length = doc.textBetween(0, mid, blockSeparator).length;
    if (length < clamped) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

export function normalizeSpellCheckIssues(
  text: string,
  matches: LanguageToolMatch[]
): SpellCheckIssue[] {
  const issues: SpellCheckIssue[] = [];

  for (const match of matches) {
    const offset = Number(match.offset);
    const length = Number(match.length);
    if (!Number.isFinite(offset) || !Number.isFinite(length) || length <= 0) {
      continue;
    }

    const issueType = match.rule?.issueType;
    const categoryId = match.rule?.category?.id;
    const isSpelling =
      issueType === "misspelling" ||
      categoryId === "TYPOS" ||
      categoryId === "SPELLING";
    if (!isSpelling) continue;

    const word = text.slice(offset, offset + length).trim();
    if (!word) continue;

    const suggestions = (match.replacements ?? [])
      .map((replacement) => String(replacement.value ?? "").trim())
      .filter(Boolean)
      .slice(0, 5);

    issues.push({
      offset,
      length,
      word,
      message: String(match.message ?? "Possible spelling mistake"),
      suggestions,
      context: String(match.context?.text ?? "").trim(),
    });
  }

  return issues;
}

export async function runSpellCheck(text: string): Promise<SpellCheckIssue[]> {
  if (!text.trim()) return [];

  const res = await fetch("/api/spell-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Spell check failed (${res.status})`;
    throw new Error(message);
  }

  const data = (await res.json()) as { issues?: SpellCheckIssue[] };
  return Array.isArray(data.issues) ? data.issues : [];
}
