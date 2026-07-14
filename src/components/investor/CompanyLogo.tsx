import React, { useEffect, useState } from "react";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";

export interface CompanyLogoProps {
  logo?: string | null;
  name: string;
  size?: number;
  width?: number;
  height?: number;
  borderRadius?: number | string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: "initial" | "label";
  fallbackLabel?: string;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({
  logo,
  name,
  size = 40,
  width,
  height,
  borderRadius = "50%",
  className = "company-logo",
  style,
  fallback = "initial",
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);
  const src = resolveCompanyLogoSrc(logo);
  const w = width ?? size;
  const h = height ?? size;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} logo`}
        width={w}
        height={h}
        className={className}
        style={{
          objectFit: "contain",
          borderRadius,
          border: "1px solid #e2e8f0",
          flexShrink: 0,
          ...style,
        }}
        onError={() => setFailed(true)}
      />
    );
  }

  if (fallback === "label") {
    return (
      <div
        style={{
          width: w,
          height: h,
          backgroundColor: "#f7fafc",
          borderRadius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "#718096",
          flexShrink: 0,
          ...style,
        }}
      >
        {fallbackLabel ?? "No Logo"}
      </div>
    );
  }

  return (
    <div
      style={{
        width: w,
        height: h,
        backgroundColor: "#f7fafc",
        borderRadius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, Math.min(12, Math.round(w * 0.3))),
        fontWeight: 600,
        color: "#64748b",
        border: "1px solid #e2e8f0",
        flexShrink: 0,
        ...style,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

export default React.memo(CompanyLogo);
