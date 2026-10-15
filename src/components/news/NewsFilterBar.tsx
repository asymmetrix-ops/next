"use client";

import { useEffect, useState } from "react";
import { locationsService } from "@/lib/locationsService";
import { dotPillStyleFromTone, getNewsSubtypeTone, NEWS_SUBTYPE_TONES } from "@/lib/tagColors";
import type { NewsFilters } from "@/lib/news";

const SUB_TYPES = ["Sale process", "Deal close", "Carve-out", "Fundraise", "IPO", "Leadership"];

type Props = {
  filters: NewsFilters;
  onChange: (patch: Partial<NewsFilters>) => void;
};

/** News sub-type pills and a primary-sector picker, above the results. */
export default function NewsFilterBar({ filters, onChange }: Props) {
  const [sectors, setSectors] = useState<Array<{ id: number; sector_name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    locationsService
      .getPrimarySectors()
      .then((rows) => !cancelled && setSectors(rows))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const sectorValue =
    filters.sector && sectors.some((s) => s.id === filters.sector!.id) ? String(filters.sector.id) : "";

  return (
    <div className="nw-filterbar">
      <div className="nw-pills" role="group" aria-label="Filter by news type">
        <button
          type="button"
          className={`nw-pill${!filters.subType ? " nw-pill-active" : ""}`}
          aria-pressed={!filters.subType}
          onClick={() => onChange({ subType: undefined })}
        >
          All types
        </button>
        {SUB_TYPES.map((t) => {
          const active = filters.subType?.toLowerCase() === t.toLowerCase();
          const tone = getNewsSubtypeTone(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              className={`nw-pill${active ? " nw-pill-active" : ""}`}
              style={active ? dotPillStyleFromTone(tone, true) : undefined}
              onClick={() => onChange({ subType: active ? undefined : t })}
            >
              <span className="nw-pill-dot" style={{ background: NEWS_SUBTYPE_TONES[t.toLowerCase()]?.dot }} />
              {t}
            </button>
          );
        })}
      </div>

      <select
        className="nw-select"
        aria-label="Filter by primary sector"
        value={sectorValue}
        onChange={(e) => {
          const id = Number(e.target.value);
          const row = sectors.find((s) => s.id === id);
          onChange({ sector: row ? { id: row.id, label: row.sector_name } : undefined });
        }}
      >
        <option value="">All primary sectors</option>
        {sectors.map((s) => (
          <option key={s.id} value={s.id}>
            {s.sector_name}
          </option>
        ))}
      </select>
    </div>
  );
}
