"use client";

import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type SearchEntityLongTextProps = {
  text: string;
};

export function SearchEntityLongText({ text }: SearchEntityLongTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const displayText = text?.trim() ? text.trim() : "-";

  const checkOverflow = useCallback(() => {
    const el = contentRef.current;
    if (!el || isExpanded) return;
    setCanExpand(el.scrollHeight > el.clientHeight + 1);
  }, [isExpanded, displayText]);

  useLayoutEffect(() => {
    checkOverflow();
  }, [checkOverflow]);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => checkOverflow());
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkOverflow]);

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setIsExpanded((prev) => !prev);
  };

  if (displayText === "-") {
    return <span>-</span>;
  }

  return (
    <div className="company-long-text">
      <div
        ref={contentRef}
        className={
          isExpanded
            ? "company-long-text-content company-long-text-content-full"
            : "company-long-text-content company-long-text-content-clamped"
        }
      >
        {displayText}
      </div>
      {canExpand ? (
        <button
          type="button"
          className="company-long-text-toggle"
          onClick={handleToggle}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      ) : null}
    </div>
  );
}

/** @deprecated Use SearchEntityLongText */
export const SearchEntityDescription = React.memo(function SearchEntityDescription({
  description,
}: {
  description: string;
}) {
  return <SearchEntityLongText text={description} />;
});
