"use client";

import React from "react";
import { HoverTooltip } from "@/components/ui/HoverTooltip";

export const NON_DA_TOOLTIP =
  "Not a Data & Analytics company - no Asymmetrix profile available.";

const NON_DA_STYLE: React.CSSProperties = {
  cursor: "help",
  textDecorationLine: "underline",
  textDecorationStyle: "dotted",
  textDecorationColor: "currentColor",
  textUnderlineOffset: 3,
};

type NonDaCompanyNameProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/** Plain-text company name (no profile) with an explanatory tooltip on hover / tap. */
export function NonDaCompanyName({
  children,
  className,
  style,
}: NonDaCompanyNameProps) {
  // Drop any link styling passed by callers: this name is not a link.
  const {
    color: _color,
    textDecoration: _textDecoration,
    ...rest
  } = style ?? {};
  void _color;
  void _textDecoration;
  return (
    <HoverTooltip content={NON_DA_TOOLTIP} tapToToggle>
      <span
        className={className}
        style={{ ...rest, color: "inherit", ...NON_DA_STYLE }}
        tabIndex={0}
      >
        {children}
      </span>
    </HoverTooltip>
  );
}

type CompanyNameLinkProps = {
  /** Profile URL for D&A companies; falsy means non-D&A (no profile). */
  href?: string | null;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

/**
 * Single rule for company names: D&A companies (href present) link to their
 * profile; everything else is plain text with the non-D&A tooltip.
 */
export function CompanyNameLink({
  href,
  children,
  className,
  style,
  onClick,
}: CompanyNameLinkProps) {
  if (href) {
    return (
      <a href={href} className={className} style={style} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <NonDaCompanyName className={className} style={style}>
      {children}
    </NonDaCompanyName>
  );
}
