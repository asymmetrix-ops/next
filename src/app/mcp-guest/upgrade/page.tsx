"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { McpGuestSalesConversionPanel } from "@/components/mcp-guest/McpGuestSalesConversionPanel";
import { MCP_GUEST_ALLOWED_PATH } from "@/lib/mcpGuest";

export default function McpGuestUpgradePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <McpGuestSalesConversionPanel />

        <div className="mt-8 text-center">
          <Link
            href={MCP_GUEST_ALLOWED_PATH}
            className="inline-flex items-center justify-center px-4 py-3 font-medium text-gray-800 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 no-underline"
          >
            Back to MCP companies
          </Link>
        </div>
      </main>
    </div>
  );
}
