import React, { useCallback } from "react";
import { useRouter } from "next/navigation";

export const useRightClick = () => {
  const router = useRouter();

  const createClickableElement = useCallback(
    (
      url: string,
      children: React.ReactNode,
      className?: string,
      style?: React.CSSProperties
    ) => {
      return (
        <a
          href={url}
          className={className}
          style={{
            textDecoration: "underline",
            color: "#0075df",
            ...style,
          }}
          onClick={(e) => {
            // Allow default for new-tab/middle-click/modified clicks
            if (
              e.defaultPrevented ||
              e.button !== 0 ||
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey
            ) {
              return;
            }
            // Client-side navigate for left clicks
            e.preventDefault();
            router.push(url);
          }}
        >
          {children}
        </a>
      );
    },
    [router]
  );

  return { createClickableElement };
};
