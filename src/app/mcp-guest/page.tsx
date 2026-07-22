import { redirect } from "next/navigation";
import { MCP_GUEST_ENTRY_PATH } from "@/lib/mcpGuest";

export default function McpGuestIndexPage() {
  redirect(MCP_GUEST_ENTRY_PATH);
}
