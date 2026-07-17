import { NextRequest, NextResponse } from "next/server";
import {
  MCP_GUEST_REQUEST_GENERIC_ERROR,
  MCP_GUEST_REQUEST_STATUS_URL,
  normalizeMcpGuestRequestEmail,
} from "@/lib/mcpGuestRequestServer";
import { isWorkEmail, WORK_EMAIL_REQUIRED_MESSAGE } from "@/lib/workEmail";

type StatusPayload = {
  status?: unknown;
  company?: unknown;
};

function parseStatus(data: unknown): StatusPayload {
  if (!data || typeof data !== "object") {
    return { status: "not_submitted", company: null };
  }

  const record = data as Record<string, unknown>;
  const status =
    typeof record.status === "string" ? record.status.trim() : "not_submitted";
  const company =
    typeof record.company === "string" && record.company.trim()
      ? record.company.trim()
      : null;

  return { status, company };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      work_email?: string;
    } | null;

    const workEmail = normalizeMcpGuestRequestEmail(body?.work_email ?? "");
    if (!workEmail) {
      return NextResponse.json(
        { error: MCP_GUEST_REQUEST_GENERIC_ERROR },
        { status: 400 }
      );
    }

    if (!isWorkEmail(workEmail)) {
      return NextResponse.json(
        { error: WORK_EMAIL_REQUIRED_MESSAGE },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({ work_email: workEmail });
    const response = await fetch(
      `${MCP_GUEST_REQUEST_STATUS_URL}?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: MCP_GUEST_REQUEST_GENERIC_ERROR },
        { status: 400 }
      );
    }

    return NextResponse.json(parseStatus(data));
  } catch {
    return NextResponse.json(
      { error: MCP_GUEST_REQUEST_GENERIC_ERROR },
      { status: 500 }
    );
  }
}
