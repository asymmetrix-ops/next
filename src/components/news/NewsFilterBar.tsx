"use client";

import { useEffect, useState } from "react";
import { locationsService } from "@/lib/locationsService";
import { dotPillStyleFromTone, formatTransactionStatusLabel, getNewsSubtypeTone } from "@/lib/tagColors";
import { fetchNewsFilterOptions, type NewsFilterOption, type NewsFilters } from "@/lib/news";

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
  /** The search box, placed first on the toolbar row (as on the Companies search page). */
  searchSlot?: React.ReactNode;
};

/**
 * Controls card, laid out like the Companies search page: News sub-type chips
 * (with counts and their colour dots) on top, then one row with the search box
 * on the left and the sector, transaction-status and "Followed only" filters beside it.
 */
export default function NewsFilterBar({ filters, onChange, totalAll, searchSlot }: Props) {
  const [sectors, setSectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [subTypes, setSubTypes] = useState<NewsFilterOption[]>([]);
  const [statuses, setStatuses] = useState<NewsFilterOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchNewsFilterOptions()
      .then(({ subTypes: types, transactionStatuses }) => {
        if (cancelled) return;
        setSubTypes([...types].sort((a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value)));
        setStatuses(transactionStatuses);
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
              <span className="nw-pill-dot" style={{ background: tone.dot }} />
              {value}
              <span className="nw-pill-count">{count.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      <div className="nw-toolbar">
        {searchSlot}

        <select
          id="nw-sector"
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

        {statuses.length > 0 && (
          <select
            id="nw-status"
            className="nw-select"
            aria-label="Filter by transaction status"
            value={filters.transactionStatus ?? ""}
            onChange={(e) => onChange({ transactionStatus: e.target.value || undefined })}
          >
            <option value="">All transaction statuses</option>
            {statuses.map((o) => (
              <option key={o.value} value={o.value}>
                {formatTransactionStatusLabel(o.value)} ({o.count})
              </option>
            ))}
          </select>
        )}

        <label className="nw-followed">
          <input
            type="checkbox"
            checked={Boolean(filters.followedOnly)}
            onChange={(e) => onChange({ followedOnly: e.target.checked || undefined })}
          />
          <span>Followed only</span>
        </label>
      </div>
    </>
  );
}
