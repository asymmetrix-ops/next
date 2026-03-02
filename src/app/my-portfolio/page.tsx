"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

type PortfolioEntityType =
  | "company"
  | "advisor"
  | "investor"
  | "individual"
  | "sector"
  | string;

type PortfolioEntityRow = {
  entity: PortfolioEntityType;
  id: number;
  name: string;
};

const formatEntityType = (entity: string) => {
  const s = (entity || "").trim().toLowerCase();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getEntityHref = (row: PortfolioEntityRow): string | null => {
  const t = String(row.entity || "").trim().toLowerCase();
  const id = row.id;
  if (!Number.isFinite(id) || id <= 0) return null;

  switch (t) {
    case "company":
      return `/company/${id}`;
    case "advisor":
      return `/advisor/${id}`;
    case "investor":
      return `/investors/${id}`;
    case "sector":
      return `/sector/${id}`;
    case "individual":
      return `/individual/${id}`;
    default:
      return null;
  }
};

export default function MyPortfolioPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PortfolioEntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const effectiveSearch = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;

    const run = async () => {
      setLoading(true);
      setError(null);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const qs = new URLSearchParams();
      if (effectiveSearch) qs.set("search", effectiveSearch);

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (token) headers["x-asym-token"] = token;

      try {
        const res = await fetch(`/api/portfolio/data?${qs.toString()}`, {
          method: "GET",
          headers,
          credentials: "include",
          signal: ac.signal,
        });

        const text = await res.text().catch(() => "");
        let data: unknown = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }

        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          if (data && typeof data === "object" && "error" in data) {
            const errVal = (data as { error?: unknown }).error;
            if (typeof errVal === "string" && errVal.trim()) message = errVal;
          }
          throw new Error(message);
        }

        setRows(Array.isArray(data) ? (data as PortfolioEntityRow[]) : []);
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setError((e as Error).message || "Failed to load portfolio");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    const t = window.setTimeout(run, 250);
    return () => {
      window.clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [effectiveSearch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Portfolio
          </h1>
          <p className="text-gray-600">
            Companies, Advisors, Investors, Sectors, and Individuals you follow.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Followed entities
            </h2>
            <span className="text-sm text-gray-500">
              {loading
                ? "Loading…"
                : `${rows.length} result${rows.length === 1 ? "" : "s"}`}
            </span>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search portfolio (e.g. "IQVIA")'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Entity Name
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Entity Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-10 text-gray-500">
                      No followed entities found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr
                      key={`${r.entity}:${r.id}:${idx}`}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-900">
                        {(() => {
                          const href = getEntityHref(r);
                          if (!href) return r.name;
                          return (
                            <Link
                              href={href}
                              className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
                            >
                              {r.name}
                            </Link>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatEntityType(String(r.entity))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

