"use client";

import React from "react";

const SHIMMER_CSS = `
  .fi-skeleton-root .fi-sk {
    background: linear-gradient(90deg, var(--ax-gray-100) 25%, var(--ax-gray-200) 50%, var(--ax-gray-100) 75%);
    background-size: 200% 100%;
    animation: fi-sk-shimmer 1.5s ease-in-out infinite;
    border-radius: var(--r-sm);
  }
  @keyframes fi-sk-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

function Sk({
  width,
  height = 14,
  style,
}: {
  width: number | string;
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="fi-sk"
      style={{
        width,
        height,
        borderRadius: height > 20 ? "var(--r-md)" : "var(--r-sm)",
        ...style,
      }}
    />
  );
}

export function FiBenchmarkSkeleton() {
  return (
    <div className="fi-skeleton-root" style={{ fontFamily: "var(--font-sans)" }}>
      <style>{SHIMMER_CSS}</style>

      {/* Headline cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "var(--ax-gray-100)",
            borderRadius: "var(--r-lg)",
            padding: "16px 18px",
            minHeight: 132,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Sk width="70%" height={10} />
          <Sk width={56} height={40} />
          <Sk width="100%" height={6} style={{ borderRadius: 3 }} />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              background: "white",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-lg)",
              padding: "14px 16px",
              minHeight: 132,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <Sk width="45%" height={12} />
              <Sk width={64} height={22} style={{ borderRadius: 999 }} />
            </div>
            <Sk width="55%" height={28} style={{ marginBottom: 14 }} />
            <Sk width="100%" height={14} style={{ marginBottom: 6 }} />
            <Sk width="100%" height={8} />
          </div>
        ))}
      </div>

      {/* Table + sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 92px 92px 1fr 96px 92px",
              padding: "10px 16px",
              gap: 8,
              borderBottom: "1px solid var(--border-1)",
              background: "var(--ax-gray-25)",
            }}
          >
            {[48, 64, 72, 80, 56, 40].map((w, i) => (
              <Sk key={i} width={w} height={10} />
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 92px 92px 1fr 96px 92px",
                alignItems: "center",
                padding: "14px 16px",
                borderBottom: i < 6 ? "1px solid var(--ax-gray-100)" : "none",
              }}
            >
              <Sk width="75%" height={14} />
              <Sk width={40} height={14} style={{ marginLeft: "auto" }} />
              <Sk width={44} height={14} style={{ marginLeft: "auto" }} />
              <Sk width="85%" height={22} />
              <Sk width={52} height={22} style={{ margin: "0 auto", borderRadius: 999 }} />
              <Sk width={36} height={14} style={{ margin: "0 auto" }} />
            </div>
          ))}
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-lg)",
            padding: 16,
          }}
        >
          <Sk width="50%" height={14} style={{ marginBottom: 12 }} />
          <Sk width="100%" height={34} style={{ marginBottom: 16, borderRadius: "var(--r-sm)" }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                borderBottom: i < 4 ? "1px solid var(--ax-gray-100)" : "none",
              }}
            >
              <Sk width={24} height={24} style={{ borderRadius: 6, flexShrink: 0 }} />
              <Sk width="70%" height={14} />
            </div>
          ))}
        </div>
      </div>

      {/* Fin table placeholder */}
      <Sk width={160} height={16} style={{ marginBottom: 8 }} />
      <div
        style={{
          background: "white",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-lg)",
          padding: 16,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Sk
            key={i}
            width={`${88 - i * 6}%`}
            height={12}
            style={{ marginBottom: i < 4 ? 10 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}

const REFRESH_CSS = `
  @keyframes fi-refresh-bar {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
`;

export function FiBenchmarkRefreshing({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      <style>{REFRESH_CSS}</style>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "var(--ax-cyan-100)",
          overflow: "hidden",
          zIndex: 5,
          borderRadius: 2,
        }}
        aria-hidden
      >
        <div
          style={{
            height: "100%",
            width: "35%",
            background: "var(--ax-cyan-600)",
            animation: "fi-refresh-bar 1.1s ease-in-out infinite",
          }}
        />
      </div>
      <div
        style={{
          opacity: 0.55,
          pointerEvents: "none",
          transition: "opacity 0.15s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
