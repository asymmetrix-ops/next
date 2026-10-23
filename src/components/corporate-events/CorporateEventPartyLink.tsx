"use client";

import React from "react";
import {
  COUNTRY_FLAG_INLINE_SIZE_PX,
  getCountryDisplayName,
  getCountryFlagDimensions,
  getCountryFlagUrl,
  INLINE_COUNTRY_FLAG_CLASS,
  readHqCountryIso2,
} from "@/lib/dealRadar";
import { cn } from "@/utils/cn";

type CountryFlagImgProps = {
  iso2: string | null | undefined;
  className?: string;
  size?: number;
};

export const CountryFlagImg: React.FC<CountryFlagImgProps> = ({
  iso2,
  className,
  size = COUNTRY_FLAG_INLINE_SIZE_PX,
}) => {
  const [tapped, setTapped] = React.useState(false);
  const countryFlagUrl = getCountryFlagUrl(iso2);
  const countryDisplayName = getCountryDisplayName(iso2);

  React.useEffect(() => {
    if (!tapped) return;
    const t = window.setTimeout(() => setTapped(false), 2000);
    const close = () => setTapped(false);
    document.addEventListener("pointerdown", close, { once: true });
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", close);
    };
  }, [tapped]);

  if (!countryFlagUrl) return null;

  const { width, height } = getCountryFlagDimensions(size);
  const label = countryDisplayName ?? iso2?.toUpperCase() ?? "";

  // Desktop: native hover tooltip via title. Touch: tapping shows the name bubble.
  return (
    <span
      title={label}
      role="img"
      aria-label={label}
      onClick={(e) => {
        // Flags often sit inside links; keep a tap on the flag from navigating.
        if (window.matchMedia?.("(hover: none)").matches) {
          e.preventDefault();
          e.stopPropagation();
          setTapped(true);
        }
      }}
      className={cn(INLINE_COUNTRY_FLAG_CLASS, className)}
      style={{ position: "relative", display: "inline-block", width, height }}
    >
      <img
        src={countryFlagUrl}
        alt=""
        width={width}
        height={height}
        style={{
          width,
          height,
          borderRadius: 2,
          objectFit: "cover",
          verticalAlign: "middle",
          display: "block",
        }}
      />
      {tapped && label ? (
        <span
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 4,
            padding: "2px 6px",
            borderRadius: 4,
            background: "#111827",
            color: "#fff",
            fontSize: 11,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
};

type CorporateEventPartyLinkProps = {
  name: string;
  href?: string | null;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
  entity?: Record<string, unknown> | null;
  hqIso2?: string | null;
  flagSize?: number;
  hideFlag?: boolean;
  /** Keeps comma on the name line when lists wrap in narrow columns. */
  trailingComma?: boolean;
};

export const CorporateEventPartyLink: React.FC<CorporateEventPartyLinkProps> = ({
  name,
  href,
  linkClassName,
  linkStyle,
  entity,
  hqIso2: hqIso2Prop,
  flagSize = COUNTRY_FLAG_INLINE_SIZE_PX,
  hideFlag = false,
  trailingComma = false,
}) => {
  const resolvedIso2 =
    hqIso2Prop ?? (entity ? readHqCountryIso2(entity) : null);
  const flagEl = resolvedIso2 && !hideFlag ? (
    <CountryFlagImg iso2={resolvedIso2} size={flagSize} />
  ) : null;

  const content = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        minWidth: 0,
        verticalAlign: "middle",
      }}
    >
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
        {trailingComma ? ",\u00a0" : null}
      </span>
      {flagEl}
    </span>
  );

  if (href) {
    return (
      <a href={href} className={linkClassName} style={linkStyle}>
        {content}
      </a>
    );
  }

  return (
    <span className={linkClassName} style={linkStyle}>
      {content}
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
  trailingComma?: boolean;
  /** When false, flag sits beside the name (better for multi-target lists). */
  stackFlag?: boolean;
};

export const CorporateEventTargetLink: React.FC<CorporateEventTargetLinkProps> = ({
  name,
  href,
  entity,
  linkClassName,
  linkStyle,
  flagClassName,
  trailingComma = false,
  stackFlag = true,
}) => {
  const hqCountryIso2 = entity ? readHqCountryIso2(entity) : null;
  const flagEl = hqCountryIso2 ? (
    <CountryFlagImg iso2={hqCountryIso2} className={flagClassName} />
  ) : null;

  const useHorizontalFlag = Boolean(flagEl && !stackFlag);

  const stackClassName = cn(
    linkClassName,
    useHorizontalFlag
      ? "inline align-middle"
      : flagEl
        ? "inline-flex flex-col items-start gap-0.5 max-w-full align-middle"
        : "inline-block max-w-full align-middle"
  );

  const nameEl = (
    <span className="leading-snug break-words">
      {name}
      {trailingComma ? ",\u00a0" : null}
    </span>
  );

  const content = useHorizontalFlag ? (
    <span
      className="inline-flex items-center gap-1 min-w-0 align-middle"
      style={{ verticalAlign: "middle" }}
    >
      {nameEl}
      {flagEl}
    </span>
  ) : (
    <>
      {nameEl}
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
