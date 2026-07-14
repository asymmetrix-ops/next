"use client";

import React from "react";
import Image from "next/image";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";

type SearchEntityIdentityCellProps = {
  name: string;
  logo?: string | null;
  subtitle?: string | null;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  readOnly?: boolean;
};

function EntityLogo({ logo }: { logo?: string | null }) {
  const src = resolveCompanyLogoSrc(logo);

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={40}
        height={40}
        style={{
          objectFit: "contain",
          borderRadius: 4,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 4,
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        color: "#94a3b8",
        flexShrink: 0,
      }}
      aria-hidden
    >
      —
    </div>
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
      <EntityLogo logo={logo} />
      <div className="company-table-entity-name-text">
        {nameContent}
        {subtitleText ? (
          <div className="company-table-entity-subtitle">{subtitleText}</div>
        ) : null}
      </div>
    </div>
  );
}
