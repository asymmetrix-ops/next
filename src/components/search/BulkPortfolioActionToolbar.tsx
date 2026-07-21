"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  bulkAddEntitiesToPortfolio,
  type BulkPortfolioAction,
  type BulkProgress,
} from "@/lib/bulkPortfolioAdd";
import type { PortfolioEntityType } from "@/lib/portfolioEntity";
import { fetchUserListsFromXano } from "@/lib/userLists";
import { usePortfolioStore } from "@/store/portfolioStore";
import { SearchExportMenu } from "@/components/search/SearchExportMenu";
import type { ListExportMode } from "@/lib/listExport/types";

type ListOption = { id: number; label: string };

const ENTITY_LABELS: Record<
  PortfolioEntityType,
  { singular: string; plural: string }
> = {
  company: { singular: "company", plural: "companies" },
  investor: { singular: "investor", plural: "investors" },
  advisor: { singular: "advisor", plural: "advisors" },
  individual: { singular: "individual", plural: "individuals" },
  sector: { singular: "sector", plural: "sectors" },
};

function parseListOptions(raw: unknown): ListOption[] {
  const arr = Array.isArray(raw) ? raw : [];
  return (arr as Record<string, unknown>[])
    .map((item) => {
      const id = Number(item.id);
      const label =
        (typeof item.portfolio_label === "string" && item.portfolio_label.trim()) ||
        (typeof item.list_name === "string" && item.list_name.trim()) ||
        `List ${id}`;
      return { id, label };
    })
    .filter((item) => Number.isFinite(item.id) && item.id > 0);
}

export function BulkPortfolioActionToolbar({
  entityType,
  entityIds,
  onClearSelection,
  onExport,
  exporting = false,
}: {
  entityType: PortfolioEntityType;
  entityIds: number[];
  onClearSelection: () => void;
  onExport?: (mode: ListExportMode) => void | Promise<void>;
  exporting?: boolean;
}) {
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);
  const count = entityIds.length;
  const labels = ENTITY_LABELS[entityType];

  const [lists, setLists] = useState<ListOption[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | "">("");
  const [newListName, setNewListName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);

  const loadLists = useCallback(() => {
    setListsLoading(true);
    fetchUserListsFromXano()
      .then((raw) => setLists(parseListOptions(raw)))
      .catch(() => setLists([]))
      .finally(() => setListsLoading(false));
  }, []);

  useEffect(() => {
    if (count === 0) return;
    loadLists();
  }, [count, loadLists]);

  const selectedListLabel = useMemo(
    () => lists.find((list) => list.id === selectedListId)?.label ?? "",
    [lists, selectedListId]
  );

  const runAction = async (action: BulkPortfolioAction, destination: string) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;
    if (!token) {
      toast.error("Please sign in to update your portfolio.");
      return;
    }

    setSubmitting(true);
    setProgress({ total: 0, done: 0, success: 0, failed: 0 });

    try {
      const result = await bulkAddEntitiesToPortfolio(
        entityType,
        entityIds,
        action,
        setProgress
      );
      await fetchPortfolio();

      const entityLabel = `${count} ${count === 1 ? labels.singular : labels.plural}`;
      if (result.failed === 0) {
        toast.success(`Added ${entityLabel} to ${destination}.`);
      } else if (result.success > 0) {
        toast.success(
          `Added ${result.success} of ${count} ${labels.plural} to ${destination}. ${result.failed} failed.`
        );
      } else {
        toast.error(`Failed to add ${labels.plural}. Please try again.`);
        return;
      }

      setSelectedListId("");
      setNewListName("");
      onClearSelection();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update portfolio.");
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const handleFollow = () => {
    void runAction({ mode: "follow" }, "My Portfolio");
  };

  const handleAddToList = () => {
    if (selectedListId === "") return;
    void runAction(
      { mode: "lists", listIds: [selectedListId] },
      selectedListLabel || "list"
    );
  };

  const handleCreateList = () => {
    const name = newListName.trim();
    if (!name) return;
    void runAction({ mode: "new_list", name }, `"${name}"`);
  };

  if (count === 0) return null;

  return (
    <div className="search-bulk-action-toolbar">
      <div className="search-bulk-action-toolbar-summary">
        <span className="search-bulk-action-toolbar-count">
          {count.toLocaleString()} selected
        </span>
        <button
          type="button"
          className="search-bulk-action-toolbar-clear"
          onClick={onClearSelection}
          disabled={submitting}
        >
          Clear
        </button>
      </div>

      <div className="search-bulk-action-toolbar-actions">
        <button
          type="button"
          className="search-bulk-action-toolbar-btn search-bulk-action-toolbar-btn-primary"
          onClick={handleFollow}
          disabled={submitting}
        >
          Follow / Add to My Portfolio
        </button>

        <div className="search-bulk-action-toolbar-group">
          <label className="search-bulk-action-toolbar-label" htmlFor="bulk-list-select">
            Add to list
          </label>
          <select
            id="bulk-list-select"
            className="search-bulk-action-toolbar-select"
            value={selectedListId === "" ? "" : String(selectedListId)}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedListId(value ? Number.parseInt(value, 10) : "");
            }}
            disabled={submitting || listsLoading}
          >
            <option value="">
              {listsLoading ? "Loading lists…" : "Select a list…"}
            </option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="search-bulk-action-toolbar-btn"
            onClick={handleAddToList}
            disabled={submitting || selectedListId === ""}
          >
            Add
          </button>
        </div>

        {onExport && (
          <SearchExportMenu
            label="Export"
            compact
            exporting={exporting}
            disabled={submitting}
            onExport={onExport}
          />
        )}

        <div className="search-bulk-action-toolbar-group">
          <label className="search-bulk-action-toolbar-label" htmlFor="bulk-new-list">
            Create new list
          </label>
          <input
            id="bulk-new-list"
            type="text"
            className="search-bulk-action-toolbar-input"
            placeholder="List name…"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newListName.trim()) handleCreateList();
            }}
          />
          <button
            type="button"
            className="search-bulk-action-toolbar-btn"
            onClick={handleCreateList}
            disabled={submitting || !newListName.trim()}
          >
            Create &amp; add
          </button>
        </div>
      </div>

      {submitting && progress && progress.total > 0 && (
        <div className="search-bulk-action-toolbar-progress">
          <div className="search-bulk-action-toolbar-progress-bar">
            <div
              className="search-bulk-action-toolbar-progress-fill"
              style={{
                width: `${Math.round((progress.done / progress.total) * 100)}%`,
              }}
            />
          </div>
          <span className="search-bulk-action-toolbar-progress-text">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}
    </div>
  );
}
