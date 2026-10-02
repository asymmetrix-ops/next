"use client";

import React, { useEffect, useState } from "react";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import type { SearchMultiValueItem } from "@/components/search/searchMultiValueUtils";
import { fetchAdvisorKeyPeople } from "@/hooks/useAdvisorDealCounts";

/** Individuals who worked on ≥1 deal for the firm: first 3, then a "+n" tag. */
export function AdvisorKeyPeopleCell({ advisorId }: { advisorId?: number }) {
  const [items, setItems] = useState<SearchMultiValueItem[] | null>(null);

  useEffect(() => {
    if (!advisorId) return;
    let cancelled = false;
    fetchAdvisorKeyPeople(advisorId).then((rows) => {
      if (cancelled) return;
      setItems(
        rows.map((r) => ({
          name: r.name,
          href: `/individual/${r.individual_id}`,
          key: `kp-${advisorId}-${r.individual_id}`,
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [advisorId]);

  if (!items || items.length === 0) return <>-</>;
  return <SearchEntityMultiValueCell items={items} maxVisible={3} />;
}
