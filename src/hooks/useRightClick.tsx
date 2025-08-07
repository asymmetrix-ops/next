import React, { useCallback } from "react";
import { useRouter } from "next/navigation";

export const useRightClick = () => {
  const router = useRouter();

  const handleRightClick = useCallback((url: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Open in new tab
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleClick = useCallback(
    (url: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Navigate in current tab
      router.push(url);
    },
    [router]
  );

  const createClickableElement = useCallback(
    (
      url: string,
      children: React.ReactNode,
      className?: string,
      style?: React.CSSProperties
    ) => {
      return (
        <span
          className={className}
          style={{
            cursor: "pointer",
            textDecoration: "underline",
            color: "#0075df",
            ...style,
          }}
          onClick={(e) => handleClick(url, e)}
          onContextMenu={(e) => handleRightClick(url, e)}
          title="Left click to navigate, Right click to open in new tab"
        >
          {children}
        </span>
      );
    },
    [handleClick, handleRightClick]
  );

  return {
    handleRightClick,
    handleClick,
    createClickableElement,
  };
};
