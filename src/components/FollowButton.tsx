"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  followPortfolioEntity,
  unfollowPortfolioEntity,
  invalidateUserPortfolioRecordCache,
  type PortfolioFollowKey,
} from "@/lib/portfolioFollow";
import {
  usePortfolioStore,
  getNamedPortfolios,
  getPortfolioDisplayLabel,
} from "@/store/portfolioStore";
import {
  addEntityToPortfolioApi,
  removeEntityFromPortfolioApi,
  fetchEntityListMembership,
  type PortfolioEntityType,
} from "@/lib/portfolioEntity";
import { toast } from "react-hot-toast";
import { NewFeatureCallout } from "@/components/ui/new-feature-callout";

/** Matches secondary sector badge on company profiles. */
const SECONDARY_SECTOR_BADGE = {
  backgroundColor: "#f3e5f5",
  color: "#7b1fa2",
  border: "1px solid #e1bee7",
} as const;

type FollowButtonProps = {
  followKey: PortfolioFollowKey;
  entityId: number;
  label: string;
  /** Entity type for list membership checks. When omitted, list dropdown is hidden. */
  entityType?: PortfolioEntityType;
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
  const [togglingListId, setTogglingListId] = useState<number | null>(null);
  const [membershipMap, setMembershipMap] = useState<Record<number, boolean>>({});
  const [membershipLoading, setMembershipLoading] = useState(false);
  const membershipAbortRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isFollowed = usePortfolioStore((s) => s.isFollowed(followKey, entityId));
  const xanoPortfolios = usePortfolioStore((s) => s.portfolios);
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);
  const portfolioLoading = usePortfolioStore((s) => s.loading);

  const namedPortfolios = useMemo(
    () => getNamedPortfolios(xanoPortfolios),
    [xanoPortfolios]
  );

  const loadListMembership = useCallback(async () => {
    if (!entityType || !Number.isFinite(entityId) || entityId <= 0) {
      setMembershipMap({});
      return;
    }

    membershipAbortRef.current?.abort();
    const ac = new AbortController();
    membershipAbortRef.current = ac;

    setMembershipLoading(true);
    try {
      const { membershipMap: map } = await fetchEntityListMembership({
        entityType,
        entityId,
        portfolioIds: namedPortfolios.map((p) => p.id),
        signal: ac.signal,
      });
      if (!ac.signal.aborted) {
        setMembershipMap(map);
      }
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        console.error("Failed to load list membership:", e);
      }
    } finally {
      if (!ac.signal.aborted) {
        setMembershipLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  // Only fetch membership when the dropdown opens — avoids cascading
  // AbortController cancellations when the portfolio store updates.
  useEffect(() => {
    if (!dropdownOpen) return;
    void loadListMembership();
    return () => {
      membershipAbortRef.current?.abort();
    };
  }, [dropdownOpen, loadListMembership]);

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
        toast.success(`Unfollowed ${label}`);
      } else {
        await followPortfolioEntity({ followKey, entityId });
        toast.success(`Following ${label}`);
      }
      invalidateUserPortfolioRecordCache();
      await fetchPortfolio();
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        alert("Please sign in to follow.");
      } else {
        console.error("Follow/unfollow failed:", e);
        toast.error("Failed to update. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [followKey, entityId, isFollowed, fetchPortfolio, label]);

  const handleListToggle = useCallback(
    async (portfolioId: number, portfolioLabel: string, currentlyIn: boolean) => {
      if (!entityType || togglingListId != null) return;

      setTogglingListId(portfolioId);
      try {
        if (currentlyIn) {
          await removeEntityFromPortfolioApi({
            portfolioId,
            entityType,
            entityId,
          });
          setMembershipMap((prev) => ({ ...prev, [portfolioId]: false }));
          toast.success(`Removed from "${portfolioLabel}"`);
        } else {
          if (!isFollowed) {
            await followPortfolioEntity({ followKey, entityId });
            invalidateUserPortfolioRecordCache();
          }
          await addEntityToPortfolioApi({
            portfolioId,
            entityType,
            entityId,
            skipGlobalFollow: true,
          });
          setMembershipMap((prev) => ({ ...prev, [portfolioId]: true }));
          toast.success(`Added to "${portfolioLabel}"`);
        }

        await fetchPortfolio();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to update portfolio"
        );
      } finally {
        setTogglingListId(null);
      }
    },
    [entityType, entityId, followKey, isFollowed, togglingListId, fetchPortfolio, loadListMembership]
  );

  const isLoading = loading || portfolioLoading;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
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
          borderRadius: "6px",
          cursor: isLoading ? "not-allowed" : "pointer",
          fontSize: "12.5px",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          ...style,
          ...(isFollowed
            ? {
                color: "white",
                border: "none",
                backgroundColor: "#ef4444",
              }
            : {
                color: SECONDARY_SECTOR_BADGE.color,
                border: SECONDARY_SECTOR_BADGE.border,
                backgroundColor: SECONDARY_SECTOR_BADGE.backgroundColor,
              }),
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

      {entityType && (
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <NewFeatureCallout
            featureKey="portfolio-lists-button"
            launchedAt="2026-06-01T00:00:00.000Z"
            durationDays={30}
            persistDismissal
            side="bottom"
            align="start"
          >
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((v) => !v);
              }}
              title="Add to portfolio"
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
          </NewFeatureCallout>

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

              {namedPortfolios.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: "13px", color: "#9ca3af" }}>
                  No lists yet.{" "}
                  <a
                    href="/my-portfolio"
                    style={{ color: "#7c3aed", textDecoration: "underline" }}
                  >
                    Create one
                  </a>
                </div>
              ) : membershipLoading && Object.keys(membershipMap).length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: "13px", color: "#9ca3af" }}>
                  Loading lists…
                </div>
              ) : (
                namedPortfolios.map((p) => {
                  const inList = membershipMap[p.id] ?? false;
                  const isToggling = togglingListId === p.id;
                  return (
                    <label
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 12px",
                        cursor: isToggling ? "wait" : "pointer",
                        fontSize: "13px",
                        color: "#111827",
                        backgroundColor: inList ? "#faf5ff" : "transparent",
                        transition: "background 0.12s",
                        opacity: isToggling ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={inList}
                        disabled={isToggling || togglingListId != null}
                        onChange={() =>
                          void handleListToggle(
                            p.id,
                            getPortfolioDisplayLabel(p),
                            inList
                          )
                        }
                        style={{ accentColor: "#7c3aed", width: "15px", height: "15px" }}
                      />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {getPortfolioDisplayLabel(p)}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
