"use client";

import { useState, useCallback } from "react";
import {
  followPortfolioEntity,
  unfollowPortfolioEntity,
  type PortfolioFollowKey,
} from "@/lib/portfolioFollow";
import { usePortfolioStore } from "@/store/portfolioStore";

interface InlineFollowButtonProps {
  followKey: PortfolioFollowKey;
  entityId: number;
  label?: string;
  /** When true, shows a text label alongside the icon. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Compact heart-icon follow toggle designed for use inside table cells and list rows.
 * Reads / writes global follow state from portfolioStore.
 */
export function InlineFollowButton({
  followKey,
  entityId,
  label,
  showLabel = false,
  className,
}: InlineFollowButtonProps) {
  const [busy, setBusy] = useState(false);

  const isFollowed = usePortfolioStore((s) => s.isFollowed(followKey, entityId));
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);
  const storeLoading = usePortfolioStore((s) => s.loading);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : null;

      if (!token) {
        alert("Please sign in to follow.");
        return;
      }

      setBusy(true);
      try {
        if (isFollowed) {
          await unfollowPortfolioEntity({ followKey, entityId });
        } else {
          await followPortfolioEntity({ followKey, entityId });
        }
        await fetchPortfolio();
      } catch (err) {
        const e = err as Error & { status?: number };
        if (e.status === 401) {
          alert("Please sign in to follow.");
        } else {
          console.error("Follow toggle failed:", err);
        }
      } finally {
        setBusy(false);
      }
    },
    [followKey, entityId, isFollowed, fetchPortfolio]
  );

  const loading = busy || storeLoading;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      title={
        loading ? "Updating…" : isFollowed ? `Unfollow${label ? ` ${label}` : ""}` : `Follow${label ? ` ${label}` : ""}`
      }
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "none",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        padding: "4px 6px",
        borderRadius: "6px",
        transition: "background 0.15s",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {/* Heart SVG — filled when followed, outline when not */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={isFollowed ? "#ef4444" : "none"}
        stroke={isFollowed ? "#ef4444" : "#9ca3af"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {showLabel && (
        <span
          style={{
            fontSize: "12px",
            color: isFollowed ? "#ef4444" : "#6b7280",
            fontWeight: 500,
          }}
        >
          {loading ? "…" : isFollowed ? "Unfollow" : "Follow"}
        </span>
      )}
    </button>
  );
}
