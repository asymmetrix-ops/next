"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  followPortfolioEntity,
  unfollowPortfolioEntity,
  type PortfolioFollowKey,
} from "@/lib/portfolioFollow";
import { usePortfolioStore } from "@/store/portfolioStore";
import {
  getPortfolioLists,
  addEntityToList,
  removeEntityFromList,
  getListsContainingEntity,
  type PortfolioList,
  type ListEntityType,
} from "@/lib/portfolioLists";

type FollowButtonProps = {
  followKey: PortfolioFollowKey;
  entityId: number;
  label: string;
  /** Entity type for list membership checks. When omitted, list dropdown is hidden. */
  entityType?: ListEntityType;
  style?: React.CSSProperties;
  className?: string;
  icon?: React.ReactNode;
};

export function FollowButton({
  followKey,
  entityId,
  label,
  entityType,
  style,
  className,
  icon,
}: FollowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lists, setLists] = useState<PortfolioList[]>([]);
  const [membershipMap, setMembershipMap] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isFollowed = usePortfolioStore((s) => s.isFollowed(followKey, entityId));
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);
  const portfolioLoading = usePortfolioStore((s) => s.loading);

  // Refresh list data whenever dropdown opens or entity changes
  const refreshLists = useCallback(() => {
    const all = getPortfolioLists();
    setLists(all);
    if (!entityType) return;
    const map: Record<string, boolean> = {};
    for (const list of all) {
      map[list.id] = list.entities.some(
        (e) => e.entityType === entityType && e.entityId === entityId
      );
    }
    setMembershipMap(map);
  }, [entityType, entityId]);

  useEffect(() => {
    if (dropdownOpen) refreshLists();
  }, [dropdownOpen, refreshLists]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleFollowClick = useCallback(async () => {
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

  const handleListToggle = useCallback(
    (listId: string, listName: string, currentlyIn: boolean) => {
      if (!entityType) return;
      if (currentlyIn) {
        removeEntityFromList(listId, entityType, entityId);
      } else {
        addEntityToList(listId, { entityType, entityId, name: label });
      }
      refreshLists();
    },
    [entityType, entityId, label, refreshLists]
  );

  const isLoading = loading || portfolioLoading;

  // Lists this entity is already in (for chip display)
  const containingLists =
    entityType ? getListsContainingEntity(entityType, entityId) : [];

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
      {/* Main follow / unfollow button */}
      <button
        type="button"
        onClick={handleFollowClick}
        disabled={isLoading}
        title={
          isLoading
            ? "Updating..."
            : isFollowed
            ? `Unfollow ${label}`
            : `Follow ${label}`
        }
        style={{
          padding: "8px 14px",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: isLoading ? "not-allowed" : "pointer",
          fontSize: "12.5px",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          ...style,
          backgroundColor: isFollowed ? "#ef4444" : "#7c3aed",
        }}
        className={className}
      >
        {icon}
        {isLoading
          ? "Updating..."
          : isFollowed
          ? `Unfollow ${label}`
          : `Follow ${label}`}
      </button>

      {/* Add to list dropdown — only shown when entityType is provided */}
      {entityType && (
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            title="Add to list"
            style={{
              padding: "8px 10px",
              backgroundColor: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              color: "#374151",
              fontWeight: 500,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Lists
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 9999,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                minWidth: "200px",
                maxWidth: "260px",
                padding: "6px 0",
              }}
            >
              <div
                style={{
                  padding: "8px 12px 4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Add to list
              </div>

              {lists.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: "13px", color: "#9ca3af" }}>
                  No lists yet.{" "}
                  <a
                    href="/my-portfolio"
                    style={{ color: "#7c3aed", textDecoration: "underline" }}
                  >
                    Create one
                  </a>
                </div>
              ) : (
                lists.map((list) => {
                  const inList = membershipMap[list.id] ?? false;
                  return (
                    <label
                      key={list.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "#111827",
                        backgroundColor: inList ? "#faf5ff" : "transparent",
                        transition: "background 0.12s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={inList}
                        onChange={() => handleListToggle(list.id, list.name, inList)}
                        style={{ accentColor: "#7c3aed", width: "15px", height: "15px" }}
                      />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {list.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* "In list" chips */}
      {containingLists.length > 0 && (
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
          {containingLists.map((list) => (
            <span
              key={list.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "2px 8px",
                backgroundColor: "#ede9fe",
                color: "#5b21b6",
                borderRadius: "100px",
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z" />
              </svg>
              {list.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
