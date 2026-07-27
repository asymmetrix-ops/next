import {
  useCallback,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

/**
 * Detects whether an element's content overflows its visible box.
 * Only measures while `measure` is true; the last truncated state is kept
 * so collapse controls stay visible after expanding.
 */
export function useTextTruncation(
  ref: RefObject<HTMLElement | null>,
  measure: boolean,
  deps: unknown[] = []
): boolean {
  const [isTruncated, setIsTruncated] = useState(false);

  const check = useCallback(() => {
    if (!measure) return;
    const el = ref.current;
    if (!el) {
      setIsTruncated(false);
      return;
    }
    setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, measure, ...deps]);

  useLayoutEffect(() => {
    if (!measure) return;

    check();
    window.addEventListener("resize", check);

    let observer: ResizeObserver | undefined;
    const el = ref.current;
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(check);
      observer.observe(el);
    }

    return () => {
      window.removeEventListener("resize", check);
      observer?.disconnect();
    };
  }, [check, measure]);

  return isTruncated;
}
