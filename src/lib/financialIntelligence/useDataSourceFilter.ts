import { useCallback, useEffect, useMemo, useState } from "react";

export function useDataSourceFilter(allSources: string[]) {
  const sourcesKey = allSources.join("\0");
  const [checkedOverrides, setCheckedOverrides] = useState<Set<string> | null>(null);

  useEffect(() => {
    setCheckedOverrides(null);
  }, [sourcesKey]);

  const checked = useMemo(() => {
    if (allSources.length === 0) return new Set<string>();
    if (checkedOverrides == null) return new Set(allSources);
    return checkedOverrides;
  }, [allSources, checkedOverrides]);

  const toggle = useCallback(
    (label: string) => {
      setCheckedOverrides((prev) => {
        const next = new Set(prev ?? allSources);
        if (next.has(label)) {
          if (next.size <= 1) return prev ?? next;
          next.delete(label);
        } else {
          next.add(label);
        }
        return next;
      });
    },
    [allSources]
  );

  const excludedSourceLabels = useMemo(
    () => allSources.filter((source) => !checked.has(source)),
    [allSources, checked]
  );

  const isDefaultSourceFilter = excludedSourceLabels.length === 0;

  return { checked, toggle, excludedSourceLabels, isDefaultSourceFilter };
}
