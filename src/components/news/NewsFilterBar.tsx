"use client";

import { useEffect, useState } from "react";
import { locationsService } from "@/lib/locationsService";
import { dotPillStyleFromTone, getNewsSubtypeTone, NEWS_SUBTYPE_TONES } from "@/lib/tagColors";
import { fetchNewsSubTypes, type NewsFilters, type NewsSubTypeOption } from "@/lib/news";

// Platform order for the pills; any other type the API returns goes after these.
const SUB_TYPE_ORDER = ["sale process", "deal close", "carve-out", "fundraise", "ipo", "leadership"];
const rank = (value: string) => {
  const i = SUB_TYPE_ORDER.indexOf(value.toLowerCase());
  return i === -1 ? SUB_TYPE_ORDER.length : i;
};

type Props = {
  filters: NewsFilters;
  onChange: (patch: Partial<NewsFilters>) => void;
  /** Number of published News, shown on the "All types" pill. */
  totalAll: number | null;
};

/**
 * Top of the controls card (same arrangement as Insights & Analysis): News
 * sub-type pills with counts, then the primary-sector picker and "Followed only".
 */
export default function NewsFilterBar({ filters, onChange, totalAll }: Props) {
  const [sectors, setSectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [subTypes, setSubTypes] = useState<NewsSubTypeOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchNewsSubTypes()
      .then((rows) => {
        if (!cancelled) setSubTypes([...rows].sort((a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value)));
      })
      .catch(() => undefined);
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
    <>
      <div className="nw-pills" role="group" aria-label="Filter by news type">
        <button
          type="button"
          className={`nw-pill${!filters.subType ? " nw-pill-active" : ""}`}
          aria-pressed={!filters.subType}
          onClick={() => onChange({ subType: undefined })}
        >
          All types
          {totalAll != null && <span className="nw-pill-count">{totalAll.toLocaleString()}</span>}
        </button>
        {subTypes.map(({ value, count }) => {
          const active = filters.subType?.toLowerCase() === value.toLowerCase();
          const tone = getNewsSubtypeTone(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              className={`nw-pill${active ? " nw-pill-active" : ""}`}
              style={active ? dotPillStyleFromTone(tone, true) : undefined}
              onClick={() => onChange({ subType: active ? undefined : value })}
            >
              <span className="nw-pill-dot" style={{ background: NEWS_SUBTYPE_TONES[value.toLowerCase()]?.dot }} />
              {value}
              <span className="nw-pill-count">{count.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      <div className="nw-fields">
        <div className="nw-field">
          <label className="nw-field-label" htmlFor="nw-sector">
            Primary sector
          </label>
          <select
            id="nw-sector"
            className="nw-select"
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

        <div className="nw-field">
          <span className="nw-field-label">View followed</span>
          <label className="nw-followed">
            <input
              type="checkbox"
              checked={Boolean(filters.followedOnly)}
              onChange={(e) => onChange({ followedOnly: e.target.checked || undefined })}
            />
            <span>Followed only</span>
          </label>
        </div>
      </div>
    </>
  );
}
