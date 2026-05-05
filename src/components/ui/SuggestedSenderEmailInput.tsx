"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UserEmailItem } from "@/lib/api";

/** From-field value: free-form email plus optional directory display name when picked from suggestions. */
export type SenderEmailFieldValue = {
  email: string;
  directoryName?: string;
};

type SuggestedSenderEmailInputProps = {
  token: string | null;
  fetchSuggestions: (token: string, query: string) => Promise<UserEmailItem[]>;
  value: SenderEmailFieldValue;
  onChange: (next: SenderEmailFieldValue) => void;
  label: string;
  placeholder?: string;
};

export function SuggestedSenderEmailInput({
  token,
  fetchSuggestions,
  value,
  onChange,
  label,
  placeholder = "Start typing a name or email, or enter any address…",
}: SuggestedSenderEmailInputProps) {
  const suggestionListId = useId();
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

  const load = useCallback(
    async (q: string) => {
      if (!token) {
        setOptions([]);
        setHighlightIndex(0);
        setLoading(false);
        return;
      }
      loadQueryRef.current = q;
      setLoading(true);
      try {
        const list = await fetchSuggestions(token, q);
        if (loadQueryRef.current !== q) return;
        const sorted = [...list].sort((a, b) => {
          const na = a.name.toLowerCase();
          const nb = b.name.toLowerCase();
          if (na !== nb) return na.localeCompare(nb);
          return a.email.toLowerCase().localeCompare(b.email.toLowerCase());
        });
        setOptions(sorted);
        setHighlightIndex(0);
      } catch {
        if (loadQueryRef.current !== q) return;
        setOptions([]);
      } finally {
        if (loadQueryRef.current === q) setLoading(false);
      }
    },
    [token, fetchSuggestions]
  );

  /** Load suggestions while menu is open; debounce only when the query is non-empty. */
  useEffect(() => {
    if (!open) return;
    const q = value.email;
    if (!q.trim()) {
      void load(q);
      return;
    }
    const t = setTimeout(() => load(q), 200);
    return () => clearTimeout(t);
  }, [value.email, load, open]);

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

  const pickSuggestion = useCallback(
    (user: UserEmailItem) => {
      onChange({
        email: user.email,
        directoryName: user.name,
      });
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange({ email: "", directoryName: undefined });
    setOpen(true);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) {
        if (e.key === "ArrowDown") {
          setOpen(true);
        }
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
    [open, options, highlightIndex, pickSuggestion]
  );

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlightIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const dropdown =
    open && menuStyle
      ? createPortal(
          <ul
            id={suggestionListId}
            ref={listRef}
            className="fixed z-[200] max-h-48 overflow-auto rounded-md border border-gray-300 bg-white py-1 shadow-lg"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
            }}
            role="listbox"
          >
            {loading && (
              <li className="px-3 py-2 text-xs text-gray-500">Loading suggestions…</li>
            )}
            {!loading && options.length === 0 && token && (
              <li className="px-3 py-2 text-xs text-gray-500">
                No directory matches — keep typing; you can use any address (not only people in the list).
              </li>
            )}
            {!loading && options.length === 0 && !token && (
              <li className="px-3 py-2 text-xs text-gray-500">
                Sign in to see suggestions from Asymmetrix users.
              </li>
            )}
            {!loading &&
              options.map((user, i) => (
                <li
                  key={`${user.email}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === highlightIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
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
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <p className="mb-1.5 text-xs text-gray-500">
        Focus the field to see everyone in the directory. Type to narrow (e.g. “Pier” shows matching names
        and emails). Choose a row for that person, or ignore the list and enter any sender address—another
        Piero, an external inbox, etc.
      </p>
      <div className="flex w-full items-center gap-2 rounded-md border border-gray-300 bg-white focus-within:ring-1 focus-within:ring-gray-400">
        <input
          ref={inputRef}
          type="text"
          inputMode="email"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? suggestionListId : undefined}
          value={value.email}
          placeholder={placeholder}
          onChange={(e) => {
            onChange({
              email: e.target.value,
              directoryName: undefined,
            });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        {value.email.trim() !== "" && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
}
