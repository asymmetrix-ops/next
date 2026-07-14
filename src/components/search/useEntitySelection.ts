"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function useEntitySelection(resetKey?: string) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [resetKey]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePageSelection = useCallback((ids: number[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedIdList,
    toggleSelection,
    togglePageSelection,
    clearSelection,
  };
}

export function usePageSelectionState(
  pageIds: number[],
  selectedIds: Set<number>
) {
  return useMemo(() => {
    if (pageIds.length === 0) {
      return { allSelected: false, someSelected: false };
    }
    let selectedOnPage = 0;
    for (const id of pageIds) {
      if (selectedIds.has(id)) selectedOnPage += 1;
    }
    return {
      allSelected: selectedOnPage === pageIds.length,
      someSelected: selectedOnPage > 0 && selectedOnPage < pageIds.length,
    };
  }, [pageIds, selectedIds]);
}
