"use client";

import React from "react";
import { CompanyAvatar } from "@/components/CompanyAvatar";

type SearchEntityIdentityCellProps = {
  name: string;
  logo?: string | null;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  readOnly?: boolean;
};

export function SearchEntityIdentityCell({
  name,
  logo,
  href,
  onClick,
  readOnly = false,
}: SearchEntityIdentityCellProps) {
  const displayName = name || "-";

  const nameContent =
    readOnly || !href ? (
      <span
        className="company-table-entity-name"
        style={readOnly ? { color: "#111827" } : undefined}
      >
        {displayName}
      </span>
    ) : (
      <a
        href={href}
        className="company-table-entity-name company-name"
        style={{ textDecoration: "none", color: "#3b82f6" }}
        onClick={onClick}
      >
        {displayName}
      </a>
    );

  return (
    <div className="company-table-entity-name-cell">
      <CompanyAvatar name={displayName} logo={logo} size={22} />
      <div className="company-table-entity-name-text">{nameContent}</div>
    </div>
  );
}
