import { redirect } from "next/navigation";
import McpGuestSignInFlow from "@/components/mcp-guest/McpGuestSignInFlow";
import { MCP_GUEST_ENTRY_PATH } from "@/lib/mcpGuest";

type McpGuestLoginPageProps = {
  searchParams?: Promise<{ otp?: string; email?: string }> | { otp?: string; email?: string };
};

export default async function McpGuestLoginPage({
  searchParams,
}: McpGuestLoginPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const showOtpForm = params.otp === "true";

  if (!showOtpForm) {
    redirect(MCP_GUEST_ENTRY_PATH);
  }

  const initialWorkEmail = params.email?.trim() ?? "";

  return <McpGuestSignInFlow initialWorkEmail={initialWorkEmail} />;
}
