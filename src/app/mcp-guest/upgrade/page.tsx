"use client";

import Link from "next/link";
import Header from "@/components/Header";
import McpGuestSalesMeetingEmbed from "@/components/mcp-guest/McpGuestSalesMeetingEmbed";
import { MCP_GUEST_ALLOWED_PATH } from "@/lib/mcpGuest";

export default function McpGuestUpgradePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            Interested in getting more info?
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Book a slot with our Sales team to learn about full Asymmetrix
            access — company profiles, exports, sectors, investors, and more.
          </p>
        </div>

        <McpGuestSalesMeetingEmbed />

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
