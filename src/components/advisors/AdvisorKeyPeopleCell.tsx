"use client";

import React, { useEffect, useState } from "react";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import type { SearchMultiValueItem } from "@/components/search/searchMultiValueUtils";
import { fetchAdvisorKeyPeople } from "@/hooks/useAdvisorDealCounts";

type KeyPeopleField = {
  total: number;
  items: Array<{ individual_id: number; name: string }>;
};

const MAX_VISIBLE = 3;

function toItems(
  advisorId: number,
  people: Array<{ individual_id: number; name: string }>
): SearchMultiValueItem[] {
  return people.map((p) => ({
    name: p.name,
    href: `/individual/${p.individual_id}`,
    key: `kp-${advisorId}-${p.individual_id}`,
  }));
}

/**
 * Individuals who worked on ≥1 deal for the firm: first 3, then a "+n" tag.
 * Reads `key_people` from the list payload; falls back to the per-advisor
 * endpoint only when the list response doesn't include the field.
 */
export function AdvisorKeyPeopleCell({
  advisorId,
  keyPeople,
}: {
  advisorId?: number;
  keyPeople?: KeyPeopleField | null;
}) {
  const hasField = keyPeople !== undefined && keyPeople !== null;
  const [fallback, setFallback] = useState<SearchMultiValueItem[] | null>(null);

  useEffect(() => {
    if (hasField || !advisorId) return;
    let cancelled = false;
    fetchAdvisorKeyPeople(advisorId).then((rows) => {
      if (!cancelled) setFallback(toItems(advisorId, rows));
    });
    return () => {
      cancelled = true;
    };
  }, [advisorId, hasField]);

  if (hasField && advisorId) {
    const items = toItems(advisorId, keyPeople.items);
    if (items.length === 0) return <>-</>;
    return (
      <SearchEntityMultiValueCell
        items={items}
        maxVisible={MAX_VISIBLE}
        extraHiddenCount={keyPeople.total - items.length}
      />
    );
  }

  if (!fallback || fallback.length === 0) return <>-</>;
  return <SearchEntityMultiValueCell items={fallback} maxVisible={MAX_VISIBLE} />;
}
