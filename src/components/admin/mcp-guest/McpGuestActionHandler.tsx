"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  acceptMcpGuestRequest,
  rejectMcpGuestRequest,
} from "@/lib/mcpGuestRequest";

type McpGuestAction = "accept" | "reject";

function buildConfirmationPath(
  action: McpGuestAction,
  outcome: "accepted" | "rejected" | "already_actioned",
  company: string,
  email: string
) {
  const params = new URLSearchParams();
  if (company) params.set("company", company);
  if (email) params.set("email", email);
  const query = params.toString();

  if (outcome === "already_actioned") {
    return `/admin/mcp-guest/already-actioned${query ? `?${query}` : ""}`;
  }

  if (action === "accept" || outcome === "accepted") {
    return `/admin/mcp-guest/accepted${query ? `?${query}` : ""}`;
  }

  return `/admin/mcp-guest/rejected${query ? `?${query}` : ""}`;
}

interface McpGuestActionHandlerProps {
  action: McpGuestAction;
}

export default function McpGuestActionHandler({
  action,
}: McpGuestActionHandlerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const token = searchParams.get("token")?.trim() ?? "";
  const company = searchParams.get("company")?.trim() ?? "";
  const email =
    searchParams.get("email")?.trim() ??
    searchParams.get("work_email")?.trim() ??
    "";

  useEffect(() => {
    if (startedRef.current) return;

    if (!token) {
      setError("This link is missing a request token.");
      return;
    }

    startedRef.current = true;

    const run = async () => {
      try {
        const result =
          action === "accept"
            ? await acceptMcpGuestRequest(token)
            : await rejectMcpGuestRequest(token);

        router.replace(
          buildConfirmationPath(
            action,
            result.outcome,
            result.company ?? company,
            result.email ?? email
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : `Could not ${action} the MCP guest request.`
        );
        startedRef.current = false;
      }
    };

    void run();
  }, [action, company, email, router, token]);

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
          {error ? (
            <>
              <h1 className="mb-3 text-3xl font-bold text-gray-900">
                Unable to process request
              </h1>
              <p className="text-gray-600 leading-relaxed">{error}</p>
            </>
          ) : (
            <>
              <h1 className="mb-3 text-3xl font-bold text-gray-900">
                Processing request…
              </h1>
              <p className="text-gray-600 leading-relaxed">
                {action === "accept" ? "Approving" : "Rejecting"} the MCP Guest
                access request.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
