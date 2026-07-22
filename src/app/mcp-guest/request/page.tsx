import { redirect } from "next/navigation";
import { MCP_TRACKER_ENTRY_PATH } from "@/lib/mcpGuest";

type LegacyRequestPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function McpGuestLegacyRequestPage({
  searchParams,
}: LegacyRequestPageProps) {
  const email = searchParams?.email;
  const emailParam =
    typeof email === "string" && email.trim()
      ? `?email=${encodeURIComponent(email.trim())}`
      : "";

  redirect(`${MCP_TRACKER_ENTRY_PATH}${emailParam}`);
}
