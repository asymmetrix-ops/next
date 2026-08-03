"use client";

import React from "react";

export function DashboardMockup({ label, stat, bars }) {
  const donutDeg = Math.round(
    (Number.parseInt(stat.value, 10) % 100 || 68) * 3.6,
  );
  return (
    <div className="landing-mockup relative w-full overflow-hidden rounded-xl p-6 md:p-8">
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
            background: `conic-gradient(hsl(228, 85%, 63%) ${donutDeg}deg, hsla(228, 85%, 63%, 0.12) 0)`,
          }}
        >
          <div className="landing-mockup-donut-inner flex size-[4.25rem] items-center justify-center rounded-full">
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
                    "linear-gradient(to top, hsla(228, 85%, 63%, 0.35), hsl(228, 85%, 63%))",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
