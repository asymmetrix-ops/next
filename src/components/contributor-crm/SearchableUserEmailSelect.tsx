"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UserEmailItem } from "@/lib/contributorCrm/api";

const EMPTY_USER_EMAIL_OPTIONS: UserEmailItem[] = [];

type SearchableUserEmailSelectProps = {
  token: string | null;
  fetchUsers: (token: string, query: string) => Promise<UserEmailItem[]>;
  value: UserEmailItem | null;
  onChange: (user: UserEmailItem | null) => void;
  label: string;
  placeholder?: string;
  /** Options always shown at the top of the dropdown (e.g. asymmetrix@...) */
  extraOptions?: UserEmailItem[];
  /** Initial search query (e.g. "asymmetrix" to pre-filter From) */
  defaultQuery?: string;
  inputSuffix?: string;
  normalizeInput?: (value: string) => string;
  searchQuery?: (query: string) => string;
  optionFilter?: (user: UserEmailItem) => boolean;
};

export function SearchableUserEmailSelect({
  token,
  fetchUsers,
  value,
  onChange,
  label,
  placeholder = "Search by name or email...",
  extraOptions = EMPTY_USER_EMAIL_OPTIONS,
  defaultQuery = "",
  inputSuffix,
  normalizeInput,
  searchQuery,
  optionFilter,
}: SearchableUserEmailSelectProps) {
  const [query, setQuery] = useState(defaultQuery);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const loadQueryRef = useRef<string>("");
  const visibleExtraOptions = useMemo(
    () => (optionFilter ? extraOptions.filter(optionFilter) : extraOptions),
    [extraOptions, optionFilter]
  );

  const load = useCallback(
    async (q: string) => {
      if (!token) {
        setOptions(visibleExtraOptions);
        setHighlightIndex(0);
        setLoading(false);
        return;
      }
      loadQueryRef.current = q;
      setLoading(true);
      try {
        const list = await fetchUsers(token, searchQuery ? searchQuery(q) : q);
        if (loadQueryRef.current !== q) return;
        const seen = new Set(visibleExtraOptions.map((o) => o.email.toLowerCase()));
        const filtered = list.filter((u) => {
          const email = u.email?.toLowerCase() ?? "";
          return !seen.has(email) && (!optionFilter || optionFilter(u));
        });
        setOptions([...visibleExtraOptions, ...filtered]);
        setHighlightIndex(0);
      } catch {
        if (loadQueryRef.current !== q) return;
        setOptions(visibleExtraOptions);
      } finally {
        if (loadQueryRef.current === q) setLoading(false);
      }
    },
    [token, fetchUsers, visibleExtraOptions, searchQuery, optionFilter]
  );

  useEffect(() => {
    const t = setTimeout(() => load(query), 200);
    return () => clearTimeout(t);
  }, [query, load]);

  const optionsList = options.length > 0 ? options : visibleExtraOptions;

  useEffect(() => {
    if (!open || value) return;
    if (query.trim()) {
      load(query);
    } else {
      setOptions(visibleExtraOptions);
      setLoading(false);
    }
  }, [open, value, query, load, visibleExtraOptions]);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleSelect = useCallback(
    (user: UserEmailItem) => {
      onChange(user);
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i < optionsList.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i > 0 ? i - 1 : optionsList.length - 1));
        return;
      }
      if (e.key === "Enter" && optionsList[highlightIndex]) {
        e.preventDefault();
        handleSelect(optionsList[highlightIndex]);
      }
    },
    [open, optionsList, highlightIndex, handleSelect]
  );

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${highlightIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const displayValue = value ? `${value.name} — ${value.email}` : "";
  const inputValue = value ? displayValue : query;

  const dropdown =
    open && menuStyle
      ? createPortal(
          <ul
            ref={listRef}
            className="fixed z-[200] max-h-48 overflow-auto rounded-md border border-[#2a2a2a] bg-[#1a1a1a] py-1 shadow-lg"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
            }}
            role="listbox"
          >
            {loading && (
              <li className="px-3 py-2 text-xs text-[#888]">Loading…</li>
            )}
            {!loading && optionsList.length === 0 && (
              <li className="px-3 py-2 text-xs text-[#888]">No results</li>
            )}
            {!loading &&
              optionsList.map((user, i) => (
                <li
                  key={`${user.email}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === highlightIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(user);
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    i === highlightIndex ? "bg-[#2a2a2a] text-white" : "text-[#e8e8e8]"
                  }`}
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="ml-2 text-[#888]">{user.email}</span>
                </li>
              ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#555]">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] focus-within:ring-1 focus-within:ring-[#444]">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          readOnly={Boolean(value)}
          placeholder={value ? "" : placeholder}
          onChange={(e) => {
            setQuery(normalizeInput ? normalizeInput(e.target.value) : e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[#555]"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded px-2 py-1 text-xs text-[#888] hover:bg-[#2a2a2a] hover:text-white"
          >
            Clear
          </button>
        )}
        {!value && inputSuffix && (
          <span className="shrink-0 pr-3 text-sm text-[#888]">{inputSuffix}</span>
        )}
      </div>
      {dropdown}
    </div>
  );
}
