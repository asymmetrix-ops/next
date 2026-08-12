import { useCallback, useMemo, useState } from "react";
import { FI_SOURCE_TYPES } from "./sourceTypes";
import type { FiMetricSourceType } from "./types";

/** Static Public / Proprietary / Estimate checkboxes — default all checked. */
export function useDataSourceFilter() {
  const [checkedOverrides, setCheckedOverrides] = useState<Set<FiMetricSourceType> | null>(
    null
  );

  const checked = useMemo(() => {
    if (checkedOverrides == null) return new Set(FI_SOURCE_TYPES);
    return checkedOverrides;
  }, [checkedOverrides]);

  const toggle = useCallback((label: FiMetricSourceType) => {
    setCheckedOverrides((prev) => {
      const next = new Set(prev ?? FI_SOURCE_TYPES);
      if (next.has(label)) {
        if (next.size <= 1) return prev ?? next;
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const excludedSourceLabels = useMemo(
    () => FI_SOURCE_TYPES.filter((source) => !checked.has(source)),
    [checked]
  );

  const allowedSourceTypes = useMemo(
    () => FI_SOURCE_TYPES.filter((source) => checked.has(source)),
    [checked]
  );

  const isDefaultSourceFilter = excludedSourceLabels.length === 0;

  const resetSourceFilter = useCallback(() => {
    setCheckedOverrides(null);
  }, []);

  return {
    checked,
    toggle,
    excludedSourceLabels,
    allowedSourceTypes,
    isDefaultSourceFilter,
    resetSourceFilter,
  };
}
