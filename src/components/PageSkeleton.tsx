"use client";

import React from "react";

/**
 * Path-aware page skeleton shown behind the AuthLoginModal.
 * Gives unauthenticated visitors a realistic "preview" of the page they
 * were trying to access so they understand what they'll unlock by signing in.
 */

// ─── Primitive shimmer pieces ─────────────────────────────────────────────────

function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={style} />
  );
}

function ShimmerLine({ width = "w-full", height = "h-4" }: { width?: string; height?: string }) {
  return <Shimmer className={`${width} ${height}`} />;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SkeletonHeader() {
  return (
    <header className="w-full bg-white border-b border-gray-200" style={{ padding: "16.5px 0" }}>
      <div className="flex items-center justify-between px-8">
        {/* Logo + nav */}
        <div className="flex items-center gap-8">
          <Shimmer className="w-10 h-10 rounded-full" />
          <div className="hidden md:flex items-center gap-6">
            {[80, 72, 64, 76, 68, 88, 100, 96].map((w, i) => (
              <Shimmer key={i} className={`h-3 rounded`} style={{ width: w }} />
            ))}
          </div>
        </div>
        {/* User area */}
        <div className="flex items-center gap-3">
          <Shimmer className="w-24 h-8 rounded-lg" />
          <Shimmer className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </header>
  );
}

function SkeletonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── Page-specific skeletons ──────────────────────────────────────────────────

/** Article / Insight detail — two-column layout */
function ArticleSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SkeletonHeader />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Back button */}
        <Shimmer className="w-48 h-8 rounded-lg" />

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Main body */}
          <SkeletonCard className="flex-[2] space-y-5">
            {/* Sector tags */}
            <div className="flex gap-2">
              <Shimmer className="w-20 h-6 rounded-full" />
              <Shimmer className="w-24 h-6 rounded-full" />
            </div>
            {/* Headline */}
            <ShimmerLine width="w-full" height="h-8" />
            <ShimmerLine width="w-3/4" height="h-8" />
            {/* Strapline */}
            <ShimmerLine width="w-full" height="h-5" />
            <ShimmerLine width="w-5/6" height="h-5" />
            {/* Meta row */}
            <div className="flex gap-4 pt-1">
              <Shimmer className="w-28 h-4 rounded" />
              <Shimmer className="w-20 h-4 rounded" />
            </div>
            {/* Body content lines */}
            <div className="space-y-3 pt-4">
              {[100, 100, 95, 100, 88, 100, 92, 100, 85, 100, 96, 78, 100, 91].map((pct, i) => (
                <ShimmerLine key={i} width={`w-[${pct}%]`} height="h-4" />
              ))}
            </div>
            {/* Quote block */}
            <div className="border-l-4 border-gray-200 pl-4 space-y-2 py-2">
              <ShimmerLine width="w-full" height="h-4" />
              <ShimmerLine width="w-4/5" height="h-4" />
            </div>
            {/* More body */}
            <div className="space-y-3">
              {[100, 93, 100, 87, 100, 90, 72].map((pct, i) => (
                <ShimmerLine key={i} width={`w-[${pct}%]`} height="h-4" />
              ))}
            </div>
          </SkeletonCard>

          {/* Right sidebar */}
          <div className="flex-[1] space-y-4">
            {/* Related events card */}
            <SkeletonCard className="space-y-4">
              <ShimmerLine width="w-2/3" height="h-5" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 pb-3 border-b border-gray-100 last:border-0">
                  <ShimmerLine width="w-full" height="h-4" />
                  <ShimmerLine width="w-3/4" height="h-3" />
                  <div className="flex gap-2">
                    <Shimmer className="w-16 h-5 rounded-full" />
                    <Shimmer className="w-20 h-5 rounded-full" />
                  </div>
                </div>
              ))}
            </SkeletonCard>
            {/* Companies mentioned */}
            <SkeletonCard className="space-y-3">
              <ShimmerLine width="w-1/2" height="h-5" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Shimmer className="w-7 h-7 rounded-full shrink-0" />
                  <ShimmerLine width="w-32" height="h-4" />
                </div>
              ))}
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Corporate Events list — filter bar + data table */
function CorporateEventsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SkeletonHeader />
      <div className="px-4 py-6 space-y-4" style={{ maxWidth: "100%" }}>
        {/* Filters card */}
        <SkeletonCard className="space-y-4">
          <ShimmerLine width="w-32" height="h-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Shimmer key={i} className="h-10 rounded-lg" />
            ))}
          </div>
          {/* Search row */}
          <div className="flex gap-3">
            <Shimmer className="flex-1 h-10 rounded-lg" />
            <Shimmer className="w-28 h-10 rounded-lg" />
          </div>
        </SkeletonCard>

        {/* Results count */}
        <div className="flex items-center justify-between px-1">
          <Shimmer className="w-40 h-5 rounded" />
          <Shimmer className="w-32 h-8 rounded-lg" />
        </div>

        {/* Table skeleton */}
        <SkeletonCard className="overflow-hidden p-0">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
            {["Event Details", "Parties", "Deal Details", "Advisor(s)", "Sectors"].map((col) => (
              <Shimmer key={col} className="h-4 rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`grid grid-cols-5 gap-4 px-5 py-4 border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}
            >
              <div className="space-y-2">
                <ShimmerLine width="w-full" height="h-4" />
                <ShimmerLine width="w-3/4" height="h-3" />
                <Shimmer className="w-16 h-5 rounded-full" />
              </div>
              <div className="space-y-2">
                <ShimmerLine width="w-4/5" height="h-4" />
                <ShimmerLine width="w-2/3" height="h-3" />
              </div>
              <div className="space-y-2">
                <Shimmer className="w-20 h-5 rounded-full" />
                <ShimmerLine width="w-3/4" height="h-3" />
              </div>
              <div className="space-y-2">
                <ShimmerLine width="w-full" height="h-4" />
                <ShimmerLine width="w-1/2" height="h-3" />
              </div>
              <div className="flex flex-wrap gap-1">
                <Shimmer className="w-16 h-5 rounded-full" />
                <Shimmer className="w-20 h-5 rounded-full" />
              </div>
            </div>
          ))}
        </SkeletonCard>
      </div>
    </div>
  );
}

/** Corporate Event detail page */
function CorporateEventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SkeletonHeader />
      <div className="px-4 py-6 space-y-5" style={{ maxWidth: "100%" }}>
        <Shimmer className="w-48 h-8 rounded-lg" />

        {/* Title card */}
        <SkeletonCard className="space-y-4">
          <div className="flex items-center gap-4">
            <Shimmer className="w-14 h-14 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <ShimmerLine width="w-1/2" height="h-7" />
              <div className="flex gap-2">
                <Shimmer className="w-24 h-6 rounded-full" />
                <Shimmer className="w-20 h-6 rounded-full" />
              </div>
            </div>
          </div>
        </SkeletonCard>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} className="space-y-2">
              <ShimmerLine width="w-1/2" height="h-3" />
              <ShimmerLine width="w-3/4" height="h-6" />
            </SkeletonCard>
          ))}
        </div>

        {/* Description card */}
        <SkeletonCard className="space-y-3">
          <ShimmerLine width="w-1/3" height="h-5" />
          {[100, 100, 90, 100, 85, 100, 78].map((pct, i) => (
            <ShimmerLine key={i} width={`w-[${pct}%]`} height="h-4" />
          ))}
        </SkeletonCard>

        {/* Parties + advisors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((col) => (
            <SkeletonCard key={col} className="space-y-3">
              <ShimmerLine width="w-1/3" height="h-5" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Shimmer className="w-8 h-8 rounded-full shrink-0" />
                  <div className="space-y-1 flex-1">
                    <ShimmerLine width="w-3/4" height="h-4" />
                    <ShimmerLine width="w-1/2" height="h-3" />
                  </div>
                </div>
              ))}
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Advisors list — filter bar + grid of advisor cards */
function AdvisorsListSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SkeletonHeader />
      <div className="px-4 py-6 space-y-4" style={{ maxWidth: "100%" }}>
        {/* Filters */}
        <SkeletonCard className="space-y-4">
          <ShimmerLine width="w-24" height="h-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Shimmer key={i} className="h-10 rounded-lg" />
            ))}
          </div>
          <div className="flex gap-3">
            <Shimmer className="flex-1 h-10 rounded-lg" />
            <Shimmer className="w-24 h-10 rounded-lg" />
          </div>
        </SkeletonCard>

        {/* Results */}
        <div className="flex items-center justify-between px-1">
          <Shimmer className="w-36 h-5 rounded" />
        </div>

        {/* Advisor cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <Shimmer className="w-12 h-12 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <ShimmerLine width="w-3/4" height="h-5" />
                  <ShimmerLine width="w-1/2" height="h-3" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3].map((t) => (
                  <Shimmer key={t} className="w-16 h-5 rounded-full" />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="text-center space-y-1">
                    <ShimmerLine width="w-full" height="h-5" />
                    <ShimmerLine width="w-3/4 mx-auto" height="h-3" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Advisor / Investor / Company detail page */
function DetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SkeletonHeader />
      <div className="px-4 py-6 space-y-5" style={{ maxWidth: "100%" }}>
        {/* Entity header */}
        <SkeletonCard className="space-y-4">
          <div className="flex items-center gap-4">
            <Shimmer className="w-16 h-16 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <ShimmerLine width="w-1/3" height="h-7" />
              <div className="flex gap-2">
                <Shimmer className="w-28 h-6 rounded-full" />
                <Shimmer className="w-20 h-6 rounded-full" />
                <Shimmer className="w-24 h-6 rounded-full" />
              </div>
            </div>
            {/* Export buttons */}
            <div className="hidden md:flex gap-2 shrink-0">
              <Shimmer className="w-24 h-9 rounded-lg" />
              <Shimmer className="w-24 h-9 rounded-lg" />
            </div>
          </div>
        </SkeletonCard>

        {/* KPI stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} className="text-center space-y-2">
              <ShimmerLine width="w-2/3 mx-auto" height="h-7" />
              <ShimmerLine width="w-1/2 mx-auto" height="h-3" />
            </SkeletonCard>
          ))}
        </div>

        {/* Tab strip */}
        <div className="flex gap-4 border-b border-gray-200 pb-0">
          {[80, 100, 120, 90, 110].map((w, i) => (
            <Shimmer key={i} className={`h-8 rounded-t`} style={{ width: w }} />
          ))}
        </div>

        {/* Tab content (table-like) */}
        <SkeletonCard className="space-y-3">
          <ShimmerLine width="w-1/4" height="h-5" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
              <ShimmerLine width="w-1/4" height="h-4" />
              <ShimmerLine width="w-1/3" height="h-4" />
              <Shimmer className="w-20 h-6 rounded-full ml-auto" />
            </div>
          ))}
        </SkeletonCard>

        {/* Secondary cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((col) => (
            <SkeletonCard key={col} className="space-y-3">
              <ShimmerLine width="w-1/3" height="h-5" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Shimmer className="w-8 h-8 rounded-full shrink-0" />
                  <div className="space-y-1 flex-1">
                    <ShimmerLine width="w-3/4" height="h-4" />
                    <ShimmerLine width="w-1/2" height="h-3" />
                  </div>
                </div>
              ))}
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Generic fallback for any other protected page */
function DefaultSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SkeletonHeader />
      <div className="px-4 py-6 space-y-4" style={{ maxWidth: "100%" }}>
        {/* Filter / heading bar */}
        <SkeletonCard className="space-y-4">
          <ShimmerLine width="w-1/4" height="h-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Shimmer key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </SkeletonCard>

        {/* Data cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <Shimmer className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <ShimmerLine width="w-3/4" height="h-5" />
                  <ShimmerLine width="w-1/2" height="h-3" />
                </div>
              </div>
              <div className="space-y-2">
                <ShimmerLine width="w-full" height="h-3" />
                <ShimmerLine width="w-5/6" height="h-3" />
                <ShimmerLine width="w-4/5" height="h-3" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Route → skeleton mapping ─────────────────────────────────────────────────

function resolveVariant(pathname: string) {
  if (pathname.startsWith("/article/")) return "article";
  if (pathname === "/corporate-events") return "corporate-events";
  if (pathname.startsWith("/corporate-event/")) return "corporate-event-detail";
  if (pathname === "/advisors") return "advisors";
  if (
    pathname.startsWith("/advisor/") ||
    pathname.startsWith("/investors/") ||
    pathname.startsWith("/company/") ||
    pathname.startsWith("/individual/")
  )
    return "detail";
  return "default";
}

// ─── Public export ─────────────────────────────────────────────────────────────

export default function PageSkeleton({ pathname }: { pathname: string }) {
  const variant = resolveVariant(pathname);

  switch (variant) {
    case "article":
      return <ArticleSkeleton />;
    case "corporate-events":
      return <CorporateEventsSkeleton />;
    case "corporate-event-detail":
      return <CorporateEventDetailSkeleton />;
    case "advisors":
      return <AdvisorsListSkeleton />;
    case "detail":
      return <DetailPageSkeleton />;
    default:
      return <DefaultSkeleton />;
  }
}
