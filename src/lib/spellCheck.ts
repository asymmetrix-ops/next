import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

const BLOCK_SEPARATOR = "\n";

export type SpellCheckIssue = {
  offset: number;
  length: number;
  word: string;
  context?: string;
  suggestions: string[];
};

/** Plain text of the document (block boundaries become newlines), for spell-check APIs. */
export function extractPlainText(doc: ProseMirrorNode): string {
  return doc.textBetween(0, doc.content.size, BLOCK_SEPARATOR, BLOCK_SEPARATOR);
}

/** Map a plain-text offset from {@link extractPlainText} to a document position. */
export function plainTextOffsetToDocPosition(
  doc: ProseMirrorNode,
  offset: number
): number {
  const size = doc.content.size;
  const fullText = extractPlainText(doc);
  const target = Math.max(0, Math.min(offset, fullText.length));

  if (target === 0) return 0;
  if (target === fullText.length) return size;

  let low = 0;
  let high = size;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const prefixLen = doc.textBetween(0, mid, BLOCK_SEPARATOR, BLOCK_SEPARATOR).length;
    if (prefixLen < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

export async function runSpellCheck(text: string): Promise<SpellCheckIssue[]> {
  const res = await fetch("/api/spell-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Spell check failed (${res.status})`);
  }

  const data = (await res.json()) as { issues?: SpellCheckIssue[] };
  return Array.isArray(data.issues) ? data.issues : [];
}
