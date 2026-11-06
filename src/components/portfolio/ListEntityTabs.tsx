"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ScopedCompaniesPanel } from "@/components/companies/ScopedCompaniesPanel";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import {
  removeEntityFromPortfolioApi,
  type PortfolioEntityType,
} from "@/lib/portfolioEntity";
import type { PortfolioFollowKey } from "@/lib/portfolioFollow";
import {
  fetchListSources,
  type ListSource,
  type ListSources,
} from "@/lib/listSources";
import { LIST_VIEW_PATHS, stashFiltersForListView } from "@/lib/openListFilters";
import { describeFilterChips } from "@/lib/savedFilterUtils";

type PortfolioEntityRow = { entity: string; id: number; name: string };

type Props = {
  listId: number;
  /** Entities in the list (from `list/data`). */
  rows: PortfolioEntityRow[];
  loading: boolean;
  /** Called after entities were removed so the page can reload the list. */
  onChanged: () => void | Promise<void>;
};

const TYPE_ORDER: PortfolioEntityType[] = [
  "company",
  "investor",
  "advisor",
  "individual",
  "sector",
];

const TYPE_LABELS: Record<PortfolioEntityType, string> = {
  company: "Companies",
  investor: "Investors",
  advisor: "Advisors",
  individual: "Individuals",
  sector: "Sectors",
};

const FOLLOW_KEYS: Record<PortfolioEntityType, PortfolioFollowKey> = {
  company: "followed_companies",
  investor: "followed_investors",
  advisor: "followed_advisors",
  individual: "followed_individuals",
  sector: "followed_sectors",
};

const PROFILE_PATHS: Record<PortfolioEntityType, string> = {
  company: "/company",
  investor: "/investors",
  advisor: "/advisor",
  individual: "/individual",
  sector: "/sector",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ListEntityTabs({ listId, rows, loading, onChanged }: Props) {
  const [picked, setPicked] = useState<PortfolioEntityType | null>(null);
  const [info, setInfo] = useState<ListSources | null>(null);
  const [version, setVersion] = useState(0);

  const byType = useMemo(() => {
    const map = new Map<PortfolioEntityType, PortfolioEntityRow[]>();
    for (const row of rows) {
      const type = String(row.entity).toLowerCase() as PortfolioEntityType;
      if (!TYPE_ORDER.includes(type)) continue;
      map.set(type, [...(map.get(type) ?? []), row]);
    }
    return map;
  }, [rows]);

  // Only types with at least one entity, the one with most entities first.
  const tabs = useMemo(
    () =>
      TYPE_ORDER.filter((t) => (byType.get(t)?.length ?? 0) > 0).sort(
        (a, b) =>
          (byType.get(b)?.length ?? 0) - (byType.get(a)?.length ?? 0) ||
          TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)
      ),
    [byType]
  );

  // The largest type unless the user picked another one that still exists.
  const active = picked && tabs.includes(picked) ? picked : tabs[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    fetchListSources(listId)
      .then((res) => {
        if (!cancelled) setInfo(res);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [listId, rows.length, version]);

  const handleRemoved = useCallback(async () => {
    setVersion((v) => v + 1);
    await onChanged();
  }, [onChanged]);

  if (loading && rows.length === 0) {
    return <div className="py-10 text-center text-gray-500">Loading…</div>;
  }
  if (tabs.length === 0 || active == null) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 text-center text-gray-500">
        This list has no entities yet.
      </div>
    );
  }

  const activeRows = byType.get(active) ?? [];
  const sources = (info?.sources ?? []).filter((s) => s.entity_type === active);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2 mb-4" role="tablist">
        {tabs.map((type) => {
          const selected = type === active;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setPicked(type)}
              className={[
                "px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap",
                selected
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-400",
              ].join(" ")}
            >
              {TYPE_LABELS[type]}{" "}
              <span className={selected ? "text-white/70" : "text-gray-400"}>
                {byType.get(type)?.length ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <ListSourceChips
        entityType={active}
        sources={sources}
        info={info}
        hasEntities={activeRows.length > 0}
      />

      {active === "company" ? (
        <ScopedCompaniesPanel
          key={`${listId}-${version}`}
          restrictToListId={listId}
          embedded
          columnsStorageKey={`portfolio-list-${listId}-companies`}
          renderSelectionBar={({ selectedIds, clear }) => (
            <RemoveSelectedBar
              listId={listId}
              entityType="company"
              selectedIds={selectedIds}
              onDone={async () => {
                clear();
                await handleRemoved();
              }}
            />
          )}
        />
      ) : (
        <BasicEntityTable
          listId={listId}
          entityType={active}
          rows={activeRows}
          onRemoved={handleRemoved}
        />
      )}
    </div>
  );
}

function ListSourceChips({
  entityType,
  sources,
  info,
  hasEntities,
}: {
  entityType: PortfolioEntityType;
  sources: ListSource[];
  info: ListSources | null;
  hasEntities: boolean;
}) {
  const router = useRouter();
  const viewPath = LIST_VIEW_PATHS[entityType];
  const linked = Boolean(info?.keepSynced) && entityType === "company";

  const openWithFilters = (source: ListSource) => {
    if (!viewPath || !source.filters) return;
    stashFiltersForListView(entityType, source.filters);
    router.push(viewPath);
  };

  // Entities with no recorded source were added one by one.
  const showManualFallback = hasEntities && sources.length === 0;
  if (!linked && sources.length === 0 && !showManualFallback) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {linked && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
            Linked to filters
          </span>
          {info?.lastSyncedAt ? (
            <span className="text-gray-500">
              Last updated {formatDate(info.lastSyncedAt)}
            </span>
          ) : (
            <span className="text-gray-500">Not updated yet</span>
          )}
        </div>
      )}
      {sources.map((source, i) => {
        const chips =
          source.kind === "filters" ? describeFilterChips(source.filters) : [];
        return (
          <div
            key={`${source.kind}-${source.added_at}-${i}`}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            {source.kind === "manual" ? (
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                Added manually
              </span>
            ) : chips.length > 0 ? (
              chips.map((chip) => (
                <span
                  key={chip}
                  className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100"
                >
                  {chip}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100">
                {source.name || "Filters"}
              </span>
            )}
            <span className="text-gray-500">
              {source.added ? `${source.added} added · ` : ""}
              {formatDate(source.added_at)}
            </span>
            {source.kind === "filters" && viewPath && source.filters && (
              <button
                type="button"
                onClick={() => openWithFilters(source)}
                className="text-blue-700 font-medium hover:underline"
              >
                Open with these filters
              </button>
            )}
          </div>
        );
      })}
      {showManualFallback && (
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            Added manually
          </span>
        </div>
      )}
    </div>
  );
}

function RemoveSelectedBar({
  listId,
  entityType,
  selectedIds,
  onDone,
}: {
  listId: number;
  entityType: PortfolioEntityType;
  selectedIds: Set<number>;
  onDone: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  if (selectedIds.size === 0) return null;

  const remove = async () => {
    setBusy(true);
    try {
      for (const entityId of Array.from(selectedIds)) {
        await removeEntityFromPortfolioApi({ portfolioId: listId, entityType, entityId });
      }
      toast.success(`Removed ${selectedIds.size} from the list`);
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-1 py-2 text-sm">
      <span className="text-gray-600">{selectedIds.size} selected</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void remove()}
        className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Removing…" : "Remove from list"}
      </button>
    </div>
  );
}

/** Table for entity types that have no scoped list view yet. */
function BasicEntityTable({
  listId,
  entityType,
  rows,
  onRemoved,
}: {
  listId: number;
  entityType: PortfolioEntityType;
  rows: PortfolioEntityRow[];
  onRemoved: () => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState<number | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    return q ? sorted.filter((r) => r.name.toLowerCase().includes(q)) : sorted;
  }, [rows, search]);

  const remove = async (row: PortfolioEntityRow) => {
    setRemoving(row.id);
    try {
      await removeEntityFromPortfolioApi({
        portfolioId: listId,
        entityType,
        entityId: row.id,
      });
      toast.success(`Removed ${row.name} from the list`);
      await onRemoved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${TYPE_LABELS[entityType].toLowerCase()} in this list`}
        className="w-full sm:w-80 mb-3 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium text-center">My Portfolio</th>
            <th className="py-2 font-medium text-right">List</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4">
                <Link
                  href={`${PROFILE_PATHS[entityType]}/${row.id}`}
                  className="text-blue-700 hover:underline"
                >
                  {row.name}
                </Link>
              </td>
              <td className="py-2 pr-4 text-center">
                <InlineFollowButton
                  followKey={FOLLOW_KEYS[entityType]}
                  entityId={row.id}
                  label={row.name}
                />
              </td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  disabled={removing === row.id}
                  onClick={() => void remove(row)}
                  className="px-2.5 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {removing === row.id ? "Removing…" : "Remove from list"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length === 0 && (
        <div className="py-6 text-center text-gray-500">No matches.</div>
      )}
    </div>
  );
}
