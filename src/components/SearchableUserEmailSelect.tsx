"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UserEmailItem } from "@/lib/api";

export type SearchableUserEmailSelectProps = {
  token: string | null;
  fetchUsers: (token: string, query: string) => Promise<UserEmailItem[]>;
  value: UserEmailItem | null;
  onChange: (user: UserEmailItem | null) => void;
  label: string;
  placeholder?: string;
  /** Listed above API hits (e.g. shared mailboxes). */
  extraOptions?: UserEmailItem[];
  /** Visual suffix after the local-part input when searching (hidden once a user is selected). */
  inputSuffix: string;
  /** Keep only the local part while typing / displaying search text. */
  normalizeInput: (raw: string) => string;
  /** Builds the `query` argument passed to `fetchUsers` (API domain rules live there). */
  searchQuery: (normalizedLocal: string) => string;
  /** Optional filter on merged suggestion rows. */
  optionFilter?: (user: UserEmailItem) => boolean;
};

function dedupeByEmail(rows: UserEmailItem[]): UserEmailItem[] {
  const seen = new Set<string>();
  const out: UserEmailItem[] = [];
  for (const u of rows) {
    const k = u.email.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(u);
  }
  return out;
}

/** Stable default — inline `() => true` in props changes every render and retriggers fetch loops. */
function defaultOptionFilter(): boolean {
  return true;
}

export function SearchableUserEmailSelect({
  token,
  fetchUsers,
  value,
  onChange,
  label,
  placeholder = "Search local part…",
  extraOptions = [],
  inputSuffix,
  normalizeInput,
  searchQuery,
  optionFilter = defaultOptionFilter,
}: SearchableUserEmailSelectProps) {
  const [draftLocal, setDraftLocal] = useState("");
  const [options, setOptions] = useState<UserEmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Monotonic id so overlapping requests never leave `loading` stuck when a stale key was superseded. */
  const fetchGenerationRef = useRef(0);
  const positionRafRef = useRef<number | null>(null);

  const extraOptionsRef = useRef(extraOptions);
  extraOptionsRef.current = extraOptions;
  const optionFilterRef = useRef(optionFilter);
  optionFilterRef.current = optionFilter;

  useEffect(() => {
    if (!value) return;
    setDraftLocal(normalizeInput(value.email));
  }, [value, normalizeInput]);

  const lockedSelection = value !== null && value.email.trim() !== "";
  const inputDisplayValue =
    lockedSelection && value
      ? `${value.name} — ${value.email}`
      : draftLocal;

  const mergeSuggestions = useCallback((fetched: UserEmailItem[]) => {
    const filter = optionFilterRef.current;
    const extras = extraOptionsRef.current;
    const base = [
      ...extras.filter(filter),
      ...fetched.filter(filter),
    ];
    return dedupeByEmail(base);
  }, []);

  const load = useCallback(
    async (normalizedLocal: string) => {
      if (!token) {
        const filter = optionFilterRef.current;
        setOptions(extraOptionsRef.current.filter(filter));
        setHighlightIndex(0);
        setLoading(false);
        return;
      }
      const q = searchQuery(normalizedLocal);
      const gen = ++fetchGenerationRef.current;
      setLoading(true);
      try {
        const list = await fetchUsers(token, q);
        if (gen !== fetchGenerationRef.current) return;
        setOptions(mergeSuggestions(Array.isArray(list) ? list : []));
        setHighlightIndex(0);
      } catch {
        if (gen !== fetchGenerationRef.current) return;
        setOptions(mergeSuggestions([]));
      } finally {
        if (gen === fetchGenerationRef.current) setLoading(false);
      }
    },
    [token, fetchUsers, searchQuery, mergeSuggestions]
  );

  useEffect(() => {
    if (!open) return;
    const normalized = normalizeInput(draftLocal);
    const delayMs = 200;
    const t = setTimeout(() => void load(normalized), delayMs);
    return () => clearTimeout(t);
  }, [draftLocal, load, open, normalizeInput]);

  useEffect(() => {
    if (!open) return;
    const commitPosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = {
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      };
      setMenuStyle((prev) => {
        if (
          prev &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width
        ) {
          return prev;
        }
        return next;
      });
    };
    const schedulePosition = () => {
      if (positionRafRef.current != null) return;
      positionRafRef.current = requestAnimationFrame(() => {
        positionRafRef.current = null;
        commitPosition();
      });
    };
    commitPosition();
    window.addEventListener("resize", schedulePosition);
    window.addEventListener("scroll", schedulePosition, true);
    return () => {
      window.removeEventListener("resize", schedulePosition);
      window.removeEventListener("scroll", schedulePosition, true);
      if (positionRafRef.current != null) {
        cancelAnimationFrame(positionRafRef.current);
        positionRafRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      if (menuPanelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const pickSuggestion = useCallback(
    (user: UserEmailItem) => {
      onChange(user);
      setDraftLocal(normalizeInput(user.email));
      setOpen(false);
      inputRef.current?.blur();
    },
    [normalizeInput, onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setDraftLocal("");
    setOptions(extraOptionsRef.current.filter(optionFilterRef.current));
    setOpen(true);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        lockedSelection &&
        e.key !== "Escape" &&
        e.key !== "ArrowDown" &&
        e.key !== "ArrowUp" &&
        e.key !== "Tab"
      ) {
        if (e.key === "Enter") e.preventDefault();
      }
      if (!open) {
        if (e.key === "ArrowDown") setOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) =>
          options.length === 0 ? 0 : i < options.length - 1 ? i + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) =>
          options.length === 0 ? 0 : i > 0 ? i - 1 : options.length - 1
        );
        return;
      }
      if (e.key === "Enter" && options.length > 0 && options[highlightIndex]) {
        e.preventDefault();
        pickSuggestion(options[highlightIndex]);
      }
    },
    [lockedSelection, open, options, highlightIndex, pickSuggestion]
  );

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlightIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const showClear =
    draftLocal.trim() !== "" || (value !== null && value.email.trim() !== "");

  const dropdown =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuPanelRef}
            className="fixed z-[200] flex max-h-52 flex-col overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
            }}
          >
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
              Directory suggestions (optional)
            </div>
            <ul
              ref={listRef}
              className="max-h-44 overflow-y-auto py-1"
              role="listbox"
            >
              {loading && (
                <li className="px-3 py-2 text-xs text-gray-500">
                  Loading suggestions…
                </li>
              )}
              {!loading && options.length === 0 && token && (
                <li className="px-3 py-2 text-xs text-gray-500">
                  No matches — refine search or use manual From below.
                </li>
              )}
              {!loading && options.length === 0 && !token && (
                <li className="px-3 py-2 text-xs text-gray-500">
                  Sign in to search sender addresses.
                </li>
              )}
              {!loading &&
                options.map((user, i) => (
                  <li
                    key={`${user.email}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === highlightIndex}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      pickSuggestion(user);
                    }}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`cursor-pointer px-3 py-2 text-sm ${
                      i === highlightIndex
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-900"
                    }`}
                  >
                    <span className="font-medium">{user.name}</span>
                    <span className="ml-2 text-gray-600">{user.email}</span>
                  </li>
                ))}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <p className="mb-1.5 text-xs text-gray-500">
        Search by local part; results come from your directory API. Pick a row
        or use manual From below — dropdown emails are shown as returned by the
        server.
      </p>
      <div className="rounded-md border border-gray-300 bg-white focus-within:ring-1 focus-within:ring-gray-400">
        <div className="flex min-w-0 items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            readOnly={lockedSelection}
            value={inputDisplayValue}
            placeholder={placeholder}
            title={lockedSelection ? value?.email : undefined}
            onChange={(e) => {
              if (lockedSelection) return;
              const next = normalizeInput(e.target.value);
              setDraftLocal(next);
              if (value !== null) onChange(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 read-only:cursor-default read-only:bg-gray-50/80"
          />
          {!lockedSelection && (
            <span className="shrink-0 pr-3 text-sm tabular-nums text-gray-500">
              {inputSuffix}
            </span>
          )}
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="mr-2 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {dropdown}
    </div>
  );
}
