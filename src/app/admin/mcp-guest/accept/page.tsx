import { Suspense } from "react";
import type { Metadata } from "next";
import McpGuestActionHandler from "@/components/admin/mcp-guest/McpGuestActionHandler";

export const metadata: Metadata = {
  title: "Approve MCP guest request | Asymmetrix",
  robots: { index: false, follow: false },
};

export default function McpGuestAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen text-gray-600">
          Loading…
        </div>
      }
    >
      <McpGuestActionHandler action="accept" />
    </Suspense>
  );
}
