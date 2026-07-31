"use client";

import React from "react";

export function DashboardMockup({ label, stat, bars }) {
  const donutDeg = Math.round(
    (Number.parseInt(stat.value, 10) % 100 || 68) * 3.6,
  );
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="landing-text-secondary ml-3 text-xs">
          Asymmetrix · {label}
        </span>
      </div>
      <div className="grid grid-cols-[max-content_1fr] items-center gap-6">
        <div
          className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(hsl(228, 85%, 63%) ${donutDeg}deg, rgba(255,255,255,0.08) 0)`,
          }}
        >
          <div className="landing-near-black-bg flex size-[4.25rem] items-center justify-center rounded-full">
            <span className="text-lg font-bold text-text-alternative">
              {stat.value}
            </span>
          </div>
        </div>
        <div>
          <p className="landing-text-secondary mb-3 text-xs uppercase tracking-wide">
            {stat.caption}
          </p>
          <div className="flex h-20 items-end gap-2">
            {bars.map((height, index) => (
              <div
                key={index}
                className="w-full rounded-t"
                style={{
                  height: `${height}%`,
                  background:
                    "linear-gradient(to top, rgba(99,127,252,0.4), #5fd0ff)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
