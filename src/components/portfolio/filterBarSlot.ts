import { useSyncExternalStore } from "react";

// The list-view filter bar renders an empty slot next to "Add filter"; the
// saved-filters menu portals into it so both sit together.
let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function registerFilterBarSlot(el: HTMLElement | null) {
  if (el === slot) return;
  slot = el;
  listeners.forEach((l) => l());
}

export function useFilterBarSlot(): HTMLElement | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => slot,
    () => null
  );
}
