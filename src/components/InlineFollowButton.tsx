"use client";

import { useState, useCallback, useEffect } from "react";
import {
  followPortfolioEntity,
  unfollowPortfolioEntity,
  type PortfolioFollowKey,
} from "@/lib/portfolioFollow";
import { usePortfolioStore } from "@/store/portfolioStore";
import { toast } from "react-hot-toast";

interface InlineFollowButtonProps {
  followKey: PortfolioFollowKey;
  entityId: number;
  label?: string;
  /** When true, shows a text label alongside the icon. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Compact heart-icon follow toggle for table cells and list rows.
 * Uses global portfolio store for followed state.
 */
export function InlineFollowButton({
  followKey,
  entityId,
  label,
  showLabel = false,
  className,
}: InlineFollowButtonProps) {
  const [busy, setBusy] = useState(false);
  const [optimisticFollowed, setOptimisticFollowed] = useState<boolean | null>(null);

  const storeFollowed = usePortfolioStore((s) => s.isFollowed(followKey, entityId));
  const portfolioData = usePortfolioStore((s) => s.data);
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);

  const isFollowed = optimisticFollowed ?? storeFollowed;

  // Ensure portfolio is loaded so hearts reflect server state
  useEffect(() => {
    if (portfolioData != null) return;
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;
    if (token) void fetchPortfolio();
  }, [portfolioData, fetchPortfolio]);

  useEffect(() => {
    setOptimisticFollowed(null);
  }, [storeFollowed, entityId]);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : null;

      if (!token) {
        toast.error("Please sign in to follow.");
        return;
      }

      const nextFollowed = !isFollowed;
      setOptimisticFollowed(nextFollowed);
      setBusy(true);

      try {
        if (isFollowed) {
          await unfollowPortfolioEntity({ followKey, entityId });
        } else {
          await followPortfolioEntity({ followKey, entityId });
        }
        await fetchPortfolio();
        setOptimisticFollowed(null);
      } catch (err) {
        setOptimisticFollowed(null);
        const error = err as Error & { status?: number };
        if (error.status === 401) {
          toast.error("Please sign in to follow.");
        } else {
          const msg = error.message || "Failed to update follow";
          toast.error(msg);
          console.error("Follow toggle failed:", err);
        }
      } finally {
        setBusy(false);
      }
    },
    [followKey, entityId, isFollowed, fetchPortfolio]
  );

  return (
    <button
      type="button"
      onClick={handleToggle}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={busy}
      aria-pressed={isFollowed}
      aria-label={
        busy
          ? "Updating follow status"
          : isFollowed
          ? `Unfollow${label ? ` ${label}` : ""}`
          : `Follow${label ? ` ${label}` : ""}`
      }
      title={
        busy
          ? "Updating…"
          : isFollowed
          ? `Unfollow${label ? ` ${label}` : ""}`
          : `Follow${label ? ` ${label}` : ""}`
      }
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "none",
        border: "none",
        cursor: busy ? "wait" : "pointer",
        padding: "4px 6px",
        borderRadius: "6px",
        transition: "background 0.15s, transform 0.1s",
        opacity: busy ? 0.6 : 1,
        position: "relative",
        zIndex: 2,
      }}
    >
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
          {busy ? "…" : isFollowed ? "Unfollow" : "Follow"}
        </span>
      )}
    </button>
  );
}
