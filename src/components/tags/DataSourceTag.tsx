import React from "react";
import { DEAL_TYPE_TONE, type TagTone } from "@/lib/tagColors";

/** Proprietary = blue, Public = grey, Estimate = amber. Chosen by label, case-insensitive. */
const SOURCE_TONES: Record<string, TagTone> = {
  proprietary: { text: "var(--c-fg-0b4f9e)", fill: "var(--c-bg-e6f0fc)", border: "var(--c-line-c5dbf6)" },
  public: DEAL_TYPE_TONE,
  estimate: { text: "var(--c-fg-8a5a00)", fill: "var(--c-bg-fff4dc)", border: "var(--c-line-f3e0b0)" },
};

/** A label that is not in the table gets the neutral grey. */
export function dataSourceTone(label: string): TagTone {
  return SOURCE_TONES[label.trim().toLowerCase()] ?? DEAL_TYPE_TONE;
}

/** Small pill under a figure. The text is exactly the label the API returned; null/empty renders nothing. */
export function DataSourceTag({ label }: { label: string | null | undefined }) {
  const text = label?.trim();
  if (!text) return null;
  const tone = dataSourceTone(text);
  return (
    <span
      className="inline-block rounded-full border text-[11px] font-medium px-2 py-0.5"
      style={{ backgroundColor: tone.fill, color: tone.text, borderColor: tone.border }}
    >
      {text}
    </span>
  );
}
