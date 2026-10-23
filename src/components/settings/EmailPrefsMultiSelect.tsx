"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional flag image shown before the label. */
  flagUrl?: string | null;
  group?: string;
}

interface EmailPrefsMultiSelectProps {
  options: MultiSelectOption[];
  /** Selected values; empty means "all". */
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel: string;
  loading?: boolean;
}

const MAX_PILLS = 5;

/** Multi-select where an empty selection (or every option ticked) means "all". */
export function EmailPrefsMultiSelect({
  options,
  selected,
  onChange,
  allLabel,
  loading = false,
}: EmailPrefsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const byValue = useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options]
  );

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next.length === options.length ? [] : next);
  };

  const q = query.trim().toLowerCase();
  const visible = options.filter((o) => o.label.toLowerCase().includes(q));
  const groups: Array<{ name: string | null; items: MultiSelectOption[] }> = [];
  for (const option of visible) {
    const name = option.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(option);
    else groups.push({ name, items: [option] });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex flex-wrap items-center gap-1.5 min-h-[34px] px-2.5 py-1 border border-gray-200 rounded-lg bg-white text-left text-[13px] text-gray-900 hover:border-gray-300"
      >
        {selected.length === 0 ? (
          <span className="text-gray-500">{loading ? "Loading…" : allLabel}</span>
        ) : (
          <>
            {selected.slice(0, MAX_PILLS).map((value) => {
              const option = byValue.get(value);
              return (
                <span
                  key={value}
                  className="inline-flex items-center gap-1.5 h-6 pl-2 pr-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold"
                >
                  {option?.flagUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={option.flagUrl} alt="" className="w-4 h-3 rounded-sm object-cover" />
                  )}
                  {option?.label ?? value}
                  <span
                    role="button"
                    aria-label={`Remove ${option?.label ?? value}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(selected.filter((v) => v !== value));
                    }}
                    className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-blue-100 cursor-pointer"
                  >
                    ×
                  </span>
                </span>
              );
            })}
            {selected.length > MAX_PILLS && (
              <span className="text-gray-500 text-xs">
                +{selected.length - MAX_PILLS} more
              </span>
            )}
          </>
        )}
        <span className="ml-auto text-[11px] text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-[10px] shadow-xl">
          <div className="flex items-center gap-2 p-2 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 h-[30px] px-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-semibold text-blue-700 whitespace-nowrap"
            >
              {selected.length ? "Clear · all" : "All selected"}
            </button>
          </div>
          <div className="max-h-[220px] overflow-auto p-1">
            {visible.length === 0 ? (
              <p className="px-2 py-1.5 text-[13px] text-gray-500">
                {loading ? "Loading…" : "No matches"}
              </p>
            ) : (
              groups.map((group, i) => (
                <div key={`${group.name ?? "g"}-${i}`}>
                  {group.name && (
                    <p className="px-2 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                      {group.name}
                    </p>
                  )}
                  {group.items.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-gray-900 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(option.value)}
                        onChange={() => toggle(option.value)}
                        className="accent-blue-600"
                      />
                      {option.flagUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={option.flagUrl} alt="" className="w-4 h-3 rounded-sm object-cover" />
                      )}
                      {option.label}
                    </label>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
