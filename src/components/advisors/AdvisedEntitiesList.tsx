"use client";

import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import {
  buildAdvisedEntityItems,
  type AdvisedEntityRef,
} from "@/components/search/searchEntityLinkUtils";

type AdvisedEntitiesListProps = {
  items: AdvisedEntityRef[];
  maxVisible?: number;
};

export function AdvisedEntitiesList({
  items,
  maxVisible = 10,
}: AdvisedEntitiesListProps) {
  if (!items?.length) return <span>-</span>;

  return (
    <SearchEntityMultiValueCell
      items={buildAdvisedEntityItems(items)}
      maxVisible={maxVisible}
    />
  );
}
