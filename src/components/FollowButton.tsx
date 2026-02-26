"use client";

import { useState, useCallback } from "react";
import {
  followPortfolioEntity,
  unfollowPortfolioEntity,
  type PortfolioFollowKey,
} from "@/lib/portfolioFollow";
import { usePortfolioStore } from "@/store/portfolioStore";

type FollowButtonProps = {
  followKey: PortfolioFollowKey;
  entityId: number;
  label: string;
  style?: React.CSSProperties;
  className?: string;
};

export function FollowButton({
  followKey,
  entityId,
  label,
  style,
  className,
}: FollowButtonProps) {
  const [loading, setLoading] = useState(false);
  const isFollowed = usePortfolioStore((s) => s.isFollowed(followKey, entityId));
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);
  const portfolioLoading = usePortfolioStore((s) => s.loading);

  const handleClick = useCallback(async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;

    if (!token) {
      alert("Please sign in to follow.");
      return;
    }

    setLoading(true);
    try {
      if (isFollowed) {
        await unfollowPortfolioEntity({ followKey, entityId });
      } else {
        await followPortfolioEntity({ followKey, entityId });
      }
      await fetchPortfolio();
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        alert("Please sign in to follow.");
      } else {
        console.error("Follow/unfollow failed:", e);
        alert("Failed to update. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [followKey, entityId, isFollowed, fetchPortfolio]);

  const isLoading = loading || portfolioLoading;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      title={
        isLoading
          ? "Updating..."
          : isFollowed
          ? `Unfollow ${label}`
          : `Follow ${label}`
      }
      style={{
        padding: "8px 16px",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: isLoading ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        ...style,
        // Ensure page-passed styles (e.g. reportButton) don't override follow colors
        backgroundColor: isFollowed ? "#ef4444" : "#7c3aed",
      }}
      className={className}
    >
      {isLoading
        ? "Updating..."
        : isFollowed
        ? `Unfollow ${label}`
        : `Follow ${label}`}
    </button>
  );
}
