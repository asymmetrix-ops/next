"use client";

import React from "react";
import {
  COUNTRY_FLAG_INLINE_SIZE_PX,
  getCountryDisplayName,
  getCountryFlagUrl,
  INLINE_COUNTRY_FLAG_CLASS,
  readHqCountryIso2,
} from "@/lib/dealRadar";
import { cn } from "@/utils/cn";

type CountryFlagImgProps = {
  iso2: string | null | undefined;
  className?: string;
};

export const CountryFlagImg: React.FC<CountryFlagImgProps> = ({
  iso2,
  className,
}) => {
  const countryFlagUrl = getCountryFlagUrl(iso2);
  const countryDisplayName = getCountryDisplayName(iso2);
  if (!countryFlagUrl) return null;

  const size = COUNTRY_FLAG_INLINE_SIZE_PX;

  return (
    <img
      src={countryFlagUrl}
      alt=""
      title={countryDisplayName ?? iso2?.toUpperCase() ?? undefined}
      aria-hidden="true"
      width={size}
      height={size}
      className={cn(INLINE_COUNTRY_FLAG_CLASS, className)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        verticalAlign: "middle",
      }}
    />
  );
};

type CorporateEventPartyLinkProps = {
  name: string;
  href?: string | null;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
};

export const CorporateEventPartyLink: React.FC<CorporateEventPartyLinkProps> = ({
  name,
  href,
  linkClassName,
  linkStyle,
}) => {
  if (href) {
    return (
      <a href={href} className={linkClassName} style={linkStyle}>
        {name}
      </a>
    );
  }

  return (
    <span className={linkClassName} style={linkStyle}>
      {name}
    </span>
  );
};

type CorporateEventTargetLinkProps = {
  name: string;
  href?: string | null;
  entity?: Record<string, unknown> | null;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
  flagClassName?: string;
};

export const CorporateEventTargetLink: React.FC<CorporateEventTargetLinkProps> = ({
  name,
  href,
  entity,
  linkClassName,
  linkStyle,
  flagClassName,
}) => {
  const hqCountryIso2 = entity ? readHqCountryIso2(entity) : null;
  const flagEl = hqCountryIso2 ? (
    <CountryFlagImg iso2={hqCountryIso2} className={flagClassName} />
  ) : null;

  const stackClassName = cn(
    linkClassName,
    flagEl
      ? "inline-flex flex-col items-start gap-0.5 max-w-full align-middle"
      : "inline-block max-w-full align-middle"
  );

  const content = (
    <>
      <span className="leading-snug break-words">{name}</span>
      {flagEl}
    </>
  );

  if (href) {
    return (
      <a href={href} className={stackClassName} style={linkStyle}>
        {content}
      </a>
    );
  }

  return (
    <span className={stackClassName} style={linkStyle}>
      {content}
    </span>
  );
};
