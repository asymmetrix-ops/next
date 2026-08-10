import { useCallback, useEffect, useMemo, useState } from "react";

export function useDataSourceFilter(allSources: string[]) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const sourcesKey = allSources.join("\0");

  useEffect(() => {
    if (allSources.length === 0) {
      setChecked(new Set());
      return;
    }
    setChecked(new Set(allSources));
  }, [sourcesKey, allSources]);

  const toggle = useCallback((label: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        if (next.size <= 1) return prev;
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const excludedSourceLabels = useMemo(
    () => allSources.filter((source) => !checked.has(source)),
    [allSources, checked]
  );

  const isDefaultSourceFilter = excludedSourceLabels.length === 0;

  return { checked, toggle, excludedSourceLabels, isDefaultSourceFilter };
}
