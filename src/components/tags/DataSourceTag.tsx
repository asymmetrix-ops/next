import React from "react";
import { DEAL_TYPE_TONE, type TagTone } from "@/lib/tagColors";

/** Proprietary = blue, Public = grey, Estimate = amber. Chosen by label, case-insensitive. */
const SOURCE_TONES: Record<string, TagTone> = {
  proprietary: { text: "#0B4F9E", fill: "#E6F0FC", border: "#C5DBF6" },
  public: DEAL_TYPE_TONE,
  estimate: { text: "#8A5A00", fill: "#FFF4DC", border: "#F3E0B0" },
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
