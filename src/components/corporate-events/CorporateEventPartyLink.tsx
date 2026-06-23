"use client";

import React from "react";
import {
  getCountryDisplayName,
  getCountryFlagUrl,
  INLINE_COUNTRY_FLAG_CLASS,
  readHqCountryIso2,
} from "@/lib/dealRadar";

type CountryFlagImgProps = {
  iso2: string | null | undefined;
  className?: string;
};

export const CountryFlagImg: React.FC<CountryFlagImgProps> = ({
  iso2,
  className = INLINE_COUNTRY_FLAG_CLASS,
}) => {
  const countryFlagUrl = getCountryFlagUrl(iso2);
  const countryDisplayName = getCountryDisplayName(iso2);
  if (!countryFlagUrl) return null;

  return (
    <img
      src={countryFlagUrl}
      alt=""
      title={countryDisplayName ?? iso2?.toUpperCase() ?? undefined}
      aria-hidden="true"
      className={className}
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
  const flagEl = (
    <CountryFlagImg iso2={hqCountryIso2} className={flagClassName} />
  );

  if (href) {
    return (
      <a href={href} className={linkClassName} style={linkStyle}>
        {name}
        {flagEl}
      </a>
    );
  }

  return (
    <span className={linkClassName} style={linkStyle}>
      {name}
      {flagEl}
    </span>
  );
};
