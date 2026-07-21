"use client";

import { MCP_GUEST_SUBSCRIPTION_MAILTO } from "@/lib/mcpGuest";
import McpGuestFlagCompanyButton from "@/components/mcp-guest/McpGuestFlagCompanyButton";

const subscriptionLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 36,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "hsl(228 85% 63%)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

export function McpGuestTrackerToolbarActions() {
  return (
    <>
      <a href={MCP_GUEST_SUBSCRIPTION_MAILTO} style={subscriptionLinkStyle}>
        Inquire about a subscription to Asymmetrix
      </a>
      <McpGuestFlagCompanyButton />
    </>
  );
}
