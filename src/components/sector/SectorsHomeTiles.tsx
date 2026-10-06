"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { dashboardApiService } from "@/lib/dashboardApi";
import { fetchCorporateEventsServer } from "@/app/corporate-events/actions";
import { createDefaultCorporateEventFilters } from "@/lib/corporateEventsFilterPayload";
import { fetchTransactionCompsServer } from "@/app/transaction-comps/actions";
import {
  DEFAULT_TRANSACTION_COMPS_QUERY,
  type TransactionCompRow,
} from "@/components/transaction-comps/transactionCompsTypes";

const TILE_ITEMS = 5;

type TileItem = { key: string | number; href: string; title: string; meta?: string };

function Tile({
  title,
  viewAllHref,
  items,
  loading,
}: {
  title: string;
  viewAllHref: string;
  items: TileItem[];
  loading: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <Link href={viewAllHref} className="text-xs font-semibold text-blue-600 hover:underline">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-slate-100">
        {loading && <li className="px-4 py-6 text-center text-xs text-slate-400">Loading…</li>}
        {!loading && items.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-slate-400">Nothing to show yet</li>
        )}
        {items.map((item) => (
          <li key={item.key} className="px-4 py-2.5">
            <Link
              href={item.href}
              className="line-clamp-2 text-[13px] font-medium text-slate-900 hover:text-blue-700"
            >
              {item.title}
            </Link>
            {item.meta && <div className="mt-0.5 text-[11px] text-slate-500">{item.meta}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const fmtDate = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const compMeta = (r: TransactionCompRow) =>
  [
    r.ev_m_usd ? `EV $${r.ev_m_usd.toLocaleString()}m` : null,
    r.ev_revenue != null ? `${r.ev_revenue.toFixed(1)}x revenue` : null,
    r.ev_ebitda != null ? `${r.ev_ebitda.toFixed(1)}x EBITDA` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** Three-tile overview at the top of the Sectors page: Recent I&A, Recent Transactions, Transaction Comps. */
export function SectorsHomeTiles() {
  const [insights, setInsights] = useState<TileItem[] | null>(null);
  const [events, setEvents] = useState<TileItem[] | null>(null);
  const [comps, setComps] = useState<TileItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const done = <T,>(set: (v: T) => void, v: T) => {
      if (!cancelled) set(v);
    };

    dashboardApiService
      .getAllContentArticlesHome()
      .then((raw) => {
        const list = (Array.isArray(raw) ? raw : []) as {
          id: number;
          Headline?: string;
          Publication_Date?: string;
        }[];
        done(
          setInsights,
          list.slice(0, TILE_ITEMS).map((a) => ({
            key: a.id,
            href: `/article/${a.id}`,
            title: a.Headline || "Untitled",
            meta: fmtDate(a.Publication_Date),
          }))
        );
      })
      .catch(() => done(setInsights, []));

    fetchCorporateEventsServer(1, { ...createDefaultCorporateEventFilters(), Per_page: TILE_ITEMS })
      .then((res) =>
        done(
          setEvents,
          (res?.items ?? []).slice(0, TILE_ITEMS).map((e) => ({
            key: e.id,
            href: `/corporate-event/${e.id}`,
            title: e.description,
            meta: [fmtDate(e.announcement_date), e.deal_type].filter(Boolean).join(" · "),
          }))
        )
      )
      .catch(() => done(setEvents, []));

    fetchTransactionCompsServer({ ...DEFAULT_TRANSACTION_COMPS_QUERY, perPage: TILE_ITEMS })
      .then((res) =>
        done(
          setComps,
          (res?.items ?? []).slice(0, TILE_ITEMS).map((r) => ({
            key: `${r.company_id}-${r.corporate_event?.id ?? ""}`,
            href: r.corporate_event ? `/corporate-event/${r.corporate_event.id}` : `/company/${r.company_id}`,
            title: r.corporate_event?.name ?? r.company_name,
            meta: compMeta(r),
          }))
        )
      )
      .catch(() => done(setComps, []));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <Tile title="Recent Insights & Analysis" viewAllHref="/insights-analysis" items={insights ?? []} loading={insights === null} />
      <Tile title="Recent Transactions" viewAllHref="/corporate-events" items={events ?? []} loading={events === null} />
      <Tile title="Transaction Comps" viewAllHref="/transaction-comps" items={comps ?? []} loading={comps === null} />
    </div>
  );
}
