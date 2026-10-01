"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CorporateEventTargetOption } from "@/lib/locationsService";

const MAX_VISIBLE = 50;

/** Searchable single-select for the Target company. */
export function TargetCombobox({
  options,
  selectedId,
  onSelect,
}: {
  options: CorporateEventTargetOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
    return all.slice(0, MAX_VISIBLE);
  }, [options, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (id: number) => {
    onSelect(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative w-64">
      <input
        type="text"
        value={query}
        placeholder={selectedId == null ? "Target: search company…" : "Change target…"}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && matches[active]) {
            e.preventDefault();
            choose(matches[active].id);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls="transaction-comps-target-list"
        aria-label="Target company"
        className="h-9 w-full rounded-full border border-gray-200 bg-white px-4 text-sm outline-none focus:border-blue-400"
      />
      {open && (
        <ul
          id="transaction-comps-target-list"
          role="listbox"
          className="absolute right-0 z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">
              {options.length === 0 ? "Loading…" : "No companies found"}
            </li>
          ) : (
            matches.map((o, i) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === selectedId}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o.id);
                }}
                className={`cursor-pointer truncate rounded-lg px-3 py-2 text-sm ${
                  i === active ? "bg-blue-50 text-blue-800" : "text-gray-700"
                } ${o.id === selectedId ? "font-semibold" : ""}`}
              >
                {o.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
