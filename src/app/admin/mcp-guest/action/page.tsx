"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import McpGuestActionHandler from "@/components/admin/mcp-guest/McpGuestActionHandler";

function parseActionType(value: string | null): "accept" | "reject" | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "accept" || normalized === "reject") {
    return normalized;
  }
  return null;
}

function McpGuestActionPageContent() {
  const searchParams = useSearchParams();
  const action = parseActionType(searchParams.get("type"));

  if (!action) {
    return (
      <div className="min-h-screen bg-[#F9FAFC]">
        <header className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200 sm:px-6">
          <Link
            href="/"
            className="flex gap-3 items-center text-gray-900 no-underline"
          >
            <Image
              src="/icons/logo.svg"
              alt="Logo"
              width={40}
              height={40}
              style={{ borderRadius: "50%" }}
            />
            <span className="hidden font-bold tracking-wide sm:inline">
              ASYMMETRIX
            </span>
          </Link>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="px-6 w-full max-w-md text-center">
            <h1 className="mb-3 text-3xl font-bold text-gray-900">
              Invalid action link
            </h1>
            <p className="text-gray-600 leading-relaxed">
              This link is missing a valid action type. Use{" "}
              <code className="text-sm">type=accept</code> or{" "}
              <code className="text-sm">type=reject</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <McpGuestActionHandler action={action} />;
}

export default function McpGuestActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen text-gray-600">
          Loading…
        </div>
      }
    >
      <McpGuestActionPageContent />
    </Suspense>
  );
}
