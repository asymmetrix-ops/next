"use client";

import React, { useEffect, useState } from "react";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import { getEntityInitials } from "@/utils/entityInitials";

type SearchEntityIdentityCellProps = {
  name: string;
  logo?: string | null;
  subtitle?: string | null;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  readOnly?: boolean;
};

function EntityLogo({
  logo,
  name,
}: {
  logo?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveCompanyLogoSrc(logo);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{
          width: 40,
          height: 40,
          objectFit: "contain",
          borderRadius: 8,
          background: "#fff",
          border: "1px solid rgba(0, 11, 41, 0.08)",
          flexShrink: 0,
        }}
      />
    );
  }

  const initial = getEntityInitials(name);

  return (
    <span
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: "var(--ax-cyan-700, #0075df)",
        color: "white",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function SearchEntityIdentityCell({
  name,
  logo,
  subtitle,
  href,
  onClick,
  readOnly = false,
}: SearchEntityIdentityCellProps) {
  const displayName = name || "-";
  const subtitleText = subtitle?.trim();

  const nameContent =
    readOnly || !href ? (
      <span className="company-table-entity-name">{displayName}</span>
    ) : (
      <a
        href={href}
        className="company-table-entity-name company-table-entity-name-link"
        onClick={onClick}
      >
        {displayName}
      </a>
    );

  return (
    <div className="company-table-entity-name-cell">
      <EntityLogo logo={logo} name={displayName} />
      <div className="company-table-entity-name-text">
        {nameContent}
        {subtitleText ? (
          <div className="company-table-entity-subtitle">{subtitleText}</div>
        ) : null}
      </div>
    </div>
  );
}
