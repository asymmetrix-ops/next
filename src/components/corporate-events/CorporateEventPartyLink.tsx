"use client";

import React from "react";
import {
  getCountryDisplayName,
  getCountryFlagUrl,
  readHqCountryIso2,
} from "@/lib/dealRadar";

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
  flagClassName = "mt-0.5 h-3 w-4 shrink-0 rounded-sm object-cover ring-1 ring-black/10 cursor-default",
}) => {
  const hqCountryIso2 = entity ? readHqCountryIso2(entity) : null;
  const countryFlagUrl = getCountryFlagUrl(hqCountryIso2);
  const countryDisplayName = getCountryDisplayName(hqCountryIso2);

  return (
    <span className="inline-flex items-start gap-1">
      <CorporateEventPartyLink
        name={name}
        href={href}
        linkClassName={linkClassName}
        linkStyle={linkStyle}
      />
      {countryFlagUrl && (
        <img
          src={countryFlagUrl}
          alt=""
          title={
            countryDisplayName ?? hqCountryIso2?.toUpperCase() ?? undefined
          }
          aria-label={
            countryDisplayName
              ? `${countryDisplayName} headquarters`
              : undefined
          }
          className={flagClassName}
        />
      )}
    </span>
  );
};
