"use client";

import { useEffect, useRef, useState } from "react";
import { locationsService } from "@/lib/locationsService";
import { dotPillStyleFromTone, formatTransactionStatusLabel, getNewsSubtypeTone } from "@/lib/tagColors";
import {
  fetchNewsFilterOptions,
  newsDatePresetRange,
  NEWS_DATE_PRESETS,
  type NewsCountryOption,
  type NewsDatePreset,
  type NewsFilterOption,
  type NewsFilters,
} from "@/lib/news";
import { getCountryFlagUrl } from "@/lib/dealRadar";

// Platform order for the pills; any other type the API returns goes after these.
const SUB_TYPE_ORDER = ["sale process", "deal close", "carve-out", "fundraise", "ipo", "leadership"];
const rank = (value: string) => {
  const i = SUB_TYPE_ORDER.indexOf(value.toLowerCase());
  return i === -1 ? SUB_TYPE_ORDER.length : i;
};

/** "Geography" dropdown: checkbox list of HQ countries with published News. */
function GeographyFilter({
  countries,
  selected,
  onChange,
}: {
  countries: NewsCountryOption[];
  selected: string[];
  onChange: (iso2Codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selectedSet = new Set(selected.map((c) => c.toUpperCase()));
  const toggle = (iso2: string) => {
    const code = iso2.toUpperCase();
    onChange(
      selectedSet.has(code) ? selected.filter((c) => c.toUpperCase() !== code) : [...selected, code]
    );
  };
  const label = selected.length === 0 ? "Geography" : selected.length === 1 ? selected[0].toUpperCase() : `Geography (${selected.length})`;

  if (countries.length === 0) return null;

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        type="button"
        className="nw-select"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ cursor: "pointer", textAlign: "left" }}
      >
        {label}
      </button>
      {open && (
        <div className="nw-geo-pop" role="group" aria-label="Filter by HQ country">
          {countries.map((c) => {
            const flag = getCountryFlagUrl(c.iso2);
            const checked = selectedSet.has(c.iso2.toUpperCase());
            return (
              <label key={c.iso2} className="nw-geo-opt">
                <input type="checkbox" checked={checked} onChange={() => toggle(c.iso2)} />
                {flag && <img src={flag} alt="" className="nw-geo-flag" />}
                <span className="nw-geo-name">{c.name}</span>
                <span className="nw-geo-count">{c.count.toLocaleString()}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CUSTOM_RANGE = "custom" as const;
type DateRangeValue = NewsDatePreset | typeof CUSTOM_RANGE | "";

/** "Date range" select: presets computed on the front, or a custom from/to pair. */
function DateRangeFilter({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom?: string;
  dateTo?: string;
  onChange: (patch: { dateFrom?: string; dateTo?: string }) => void;
}) {
  const hasRange = Boolean(dateFrom || dateTo);
  const [customOpen, setCustomOpen] = useState(false);
  const value: DateRangeValue = customOpen ? CUSTOM_RANGE : hasRange ? CUSTOM_RANGE : "";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <select
        id="nw-date-range"
        className="nw-select"
        aria-label="Filter by publication date"
        value={hasRange && !customOpen ? "" : value}
        onChange={(e) => {
          const v = e.target.value as DateRangeValue;
          if (v === "") {
            setCustomOpen(false);
            onChange({ dateFrom: undefined, dateTo: undefined });
          } else if (v === CUSTOM_RANGE) {
            setCustomOpen(true);
          } else {
            setCustomOpen(false);
            onChange(newsDatePresetRange(v));
          }
        }}
      >
        <option value="">Any time</option>
        {NEWS_DATE_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
        <option value={CUSTOM_RANGE}>Custom range…</option>
      </select>
      {(customOpen || hasRange) && (
        <>
          <input
            type="date"
            className="nw-select"
            aria-label="From date"
            value={dateFrom ?? ""}
            onChange={(e) => onChange({ dateFrom: e.target.value || undefined, dateTo })}
          />
          <span style={{ color: "#8a93a8", fontSize: 13 }}>–</span>
          <input
            type="date"
            className="nw-select"
            aria-label="To date"
            value={dateTo ?? ""}
            onChange={(e) => onChange({ dateFrom, dateTo: e.target.value || undefined })}
          />
        </>
      )}
    </div>
  );
}

type Props = {
  filters: NewsFilters;
  onChange: (patch: Partial<NewsFilters>) => void;
  /** Kept for API compatibility; article counts are hidden on the Types filter (low volume works against us for now). */
  totalAll: number | null;
  /** The search box, placed first on the toolbar row (as on the Companies search page). */
  searchSlot?: React.ReactNode;
};

/**
 * Controls card, laid out like the Companies search page: News sub-type chips
 * (their colour dots, no article counts) on top, then one row with the search box
 * on the left and the sector, transaction-status and "Followed only" filters beside it.
 */
export default function NewsFilterBar({ filters, onChange, searchSlot }: Props) {
  const [sectors, setSectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [subTypes, setSubTypes] = useState<NewsFilterOption[]>([]);
  const [statuses, setStatuses] = useState<NewsFilterOption[]>([]);
  const [countries, setCountries] = useState<NewsCountryOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchNewsFilterOptions()
      .then(({ subTypes: types, transactionStatuses, countries: countryRows }) => {
        if (cancelled) return;
        setSubTypes([...types].sort((a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value)));
        setStatuses(transactionStatuses);
        setCountries(countryRows);
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
        </button>
        {subTypes.map(({ value }) => {
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

        <GeographyFilter
          countries={countries}
          selected={filters.countries ?? []}
          onChange={(codes) => onChange({ countries: codes.length > 0 ? codes : undefined })}
        />

        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(patch) => onChange(patch)}
        />

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
