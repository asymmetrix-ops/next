"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  placeholder = "Type any email, or pick an Asymmetrix user below…",
}: SuggestedSenderEmailInputProps) {
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
        setOptions(list);
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
        top: rect.bottom + 8,
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
      if (menuPanelRef.current?.contains(target)) return;
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
      inputRef.current?.blur();
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
              <li className="px-3 py-2 text-xs text-gray-500">Loading suggestions…</li>
            )}
            {!loading && options.length === 0 && token && (
              <li className="px-3 py-2 text-xs text-gray-500">
                No directory matches — keep typing; any email address is allowed.
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
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <p className="mb-1.5 text-xs text-gray-500">
        Enter any sender address here. While this field is focused, a separate directory panel
        opens below with matching Asymmetrix users — click a row to fill the email, or ignore it
        and keep typing a custom address.
      </p>
      <div className="rounded-md border border-gray-300 bg-white focus-within:ring-1 focus-within:ring-gray-400">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="email"
            autoComplete="email"
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
      </div>
      {dropdown}
    </div>
  );
}
