"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BasicUserItem } from "@/lib/api";
import { fetchAllUsers } from "@/lib/api";

type BasicUsersMultiSelectProps = {
  token: string | null;
  value: BasicUserItem[];
  onChange: (next: BasicUserItem[]) => void;
  label: string;
};

export function BasicUsersMultiSelect({
  token,
  value,
  onChange,
  label,
}: BasicUsersMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cache, setCache] = useState<BasicUserItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(() => new Set(value.map((u) => u.id)), [value]);

  useEffect(() => {
    if (!open || !token) return;
    if (cache !== null) return;
    let cancelled = false;
    setLoading(true);
    fetchAllUsers(token)
      .then((list) => {
        if (!cancelled) setCache(list);
      })
      .catch(() => {
        if (!cancelled) setCache([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token, cache]);

  useEffect(() => {
    if (open) {
      setSearch("");
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 320),
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

  const filtered = useMemo(() => {
    if (!cache) return [];
    const q = search.trim().toLowerCase();
    if (!q) return cache;
    return cache.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.Company ?? "").includes(q)
    );
  }, [cache, search]);

  const toggleUser = useCallback(
    (user: BasicUserItem) => {
      if (selectedIds.has(user.id)) {
        onChange(value.filter((u) => u.id !== user.id));
      } else {
        onChange([...value, user]);
      }
    },
    [selectedIds, value, onChange]
  );

  const removeUser = useCallback(
    (id: number) => {
      onChange(value.filter((u) => u.id !== id));
    },
    [value, onChange]
  );

  const dropdown =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuPanelRef}
            className="fixed z-[200] flex max-h-[min(24rem,calc(100vh-8rem))] flex-col overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
            }}
          >
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-xs font-semibold text-gray-700">
                Basic users (all_users)
              </div>
              <div className="mt-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name, email, company id…"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {!token && (
                <p className="px-3 py-2 text-xs text-gray-500">
                  Sign in to load users.
                </p>
              )}
              {token && loading && (
                <p className="px-3 py-2 text-xs text-gray-500">Loading…</p>
              )}
              {token && !loading && filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-500">No matches.</p>
              )}
              {token &&
                !loading &&
                filtered.map((u) => {
                  const checked = selectedIds.has(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(u)}
                        className="mt-0.5 rounded border-gray-300"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900">{u.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-gray-600">
                          {u.email}
                          {u.Company != null ? ` · Company ${u.Company}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
              <button
                type="button"
                className="w-full rounded bg-gray-800 py-1.5 text-sm text-white hover:bg-gray-900"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative max-w-xl">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <p className="mb-2 text-xs text-gray-500">
        Separate from the sender field: pick one or more directory users here.
        Selections are kept in the builder and preview only (not sent on Submit/Save
        until the API is extended).
      </p>

      {value.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((u) => (
            <span
              key={u.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 py-1 pl-2 pr-1 text-xs text-gray-800"
            >
              <span className="truncate" title={`${u.name} ${u.email}`}>
                {u.name}
              </span>
              <button
                type="button"
                className="shrink-0 rounded-full px-1.5 leading-none text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                aria-label={`Remove ${u.name}`}
                onClick={() => removeUser(u.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
      >
        {value.length === 0
          ? "Open basic users list…"
          : `${value.length} selected — open list to add or change`}
      </button>

      {dropdown}
    </div>
  );
}
