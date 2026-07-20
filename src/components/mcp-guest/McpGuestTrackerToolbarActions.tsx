"use client";

import Link from "next/link";
import {
  MCP_GUEST_CONTRIBUTE_MAILTO,
  MCP_GUEST_CONVERSION_PATH,
  MCP_GUEST_SUBSCRIPTION_MAILTO,
} from "@/lib/mcpGuest";
import { SEARCH_HEADER_ACTION_BUTTON_STYLE } from "@/components/search/searchHeaderActions";
import McpGuestFlagCompanyButton from "@/components/mcp-guest/McpGuestFlagCompanyButton";

const outlineLinkStyle: React.CSSProperties = {
  ...SEARCH_HEADER_ACTION_BUTTON_STYLE,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

export function McpGuestTrackerToolbarActions() {
  return (
    <>
      <Link href={MCP_GUEST_CONVERSION_PATH} style={outlineLinkStyle}>
        Book a call with sales
      </Link>
      <a href={MCP_GUEST_CONTRIBUTE_MAILTO} style={outlineLinkStyle}>
        Contribute data on your company
      </a>
      <a href={MCP_GUEST_SUBSCRIPTION_MAILTO} style={outlineLinkStyle}>
        Inquire about a subscription to Asymmetrix
      </a>
      <McpGuestFlagCompanyButton />
    </>
  );
}
