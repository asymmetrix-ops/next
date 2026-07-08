"use client";

import React, { useEffect, useState } from "react";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";

export function CompanyAvatar({
  name,
  logo,
  size = 22,
  fallbackColor = "var(--ax-cyan-700)",
}: {
  name: string;
  logo?: string | null;
  size?: number;
  fallbackColor?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveCompanyLogoSrc(logo);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: 5,
          objectFit: "contain",
          background: "var(--ax-gray-25)",
          border: "1px solid var(--border-1)",
          flexShrink: 0,
        }}
      />
    );
  }

  const initial = name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        background: fallbackColor,
        color: "white",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size <= 18 ? 10 : 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}
