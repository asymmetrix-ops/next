"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import McpGuestPageShell from "@/components/mcp-guest/McpGuestPageShell";
import McpGuestRequestForm from "@/components/mcp-guest/McpGuestRequestForm";
import { MCP_GUEST_OTP_LOGIN_PATH, MCP_GUEST_TRACKER_REQUEST_TITLE } from "@/lib/mcpGuest";

function McpGuestRequestContent() {
  const searchParams = useSearchParams();
  const initialWorkEmail = searchParams.get("email")?.trim() ?? "";

  return (
    <>
      <McpGuestRequestForm
        initialWorkEmail={initialWorkEmail}
        lockWorkEmail={Boolean(initialWorkEmail)}
      />

      <p className="mt-6 text-sm text-center text-gray-600">
        Already approved?{" "}
        <Link href={MCP_GUEST_OTP_LOGIN_PATH} className="text-blue-600 hover:underline">
          Sign in with your one-time password
        </Link>
      </p>
    </>
  );
}

export default function McpTrackerRequestPage() {
  return (
    <McpGuestPageShell>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {MCP_GUEST_TRACKER_REQUEST_TITLE}
        </h1>
        <p className="text-gray-600">
          Tell us a bit about yourself. We&apos;ll review your request and
          follow up by email.
        </p>
      </div>

      <Suspense fallback={null}>
        <McpGuestRequestContent />
      </Suspense>
    </McpGuestPageShell>
  );
}
