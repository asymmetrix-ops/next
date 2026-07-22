import { redirect } from "next/navigation";
import { MCP_GUEST_ALLOWED_PATH } from "@/lib/mcpGuest";

export default function McpGuestUpgradePage() {
  redirect(`${MCP_GUEST_ALLOWED_PATH}?book=1`);
}
