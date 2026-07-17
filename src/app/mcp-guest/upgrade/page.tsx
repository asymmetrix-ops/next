"use client";

import Link from "next/link";
import McpGuestPageShell from "@/components/mcp-guest/McpGuestPageShell";
import { MCP_GUEST_ALLOWED_PATH } from "@/lib/mcpGuest";

export default function McpGuestUpgradePage() {
  return (
    <McpGuestPageShell>
      <div className="text-center">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          Unlock full company profiles
        </h1>
        <p className="mb-8 text-gray-600 leading-relaxed">
          MCP Guest access includes the full MCP company list. Company profiles,
          exports, and the rest of the platform require a full Asymmetrix
          subscription.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="https://www.asymmetrixintelligence.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 no-underline"
          >
            Contact sales
          </a>
          <Link
            href={MCP_GUEST_ALLOWED_PATH}
            className="px-4 py-3 w-full font-medium text-gray-800 bg-gray-100 rounded-lg border border-gray-200 hover:bg-gray-200 no-underline"
          >
            Back to MCP companies
          </Link>
        </div>
      </div>
    </McpGuestPageShell>
  );
}
