import { redirect } from "next/navigation";
import {
  MCP_GUEST_ENTRY_PATH,
  MCP_GUEST_SIGN_IN_PATH,
} from "@/lib/mcpGuest";

type McpGuestLoginPageProps = {
  searchParams?: Promise<{ otp?: string; email?: string }> | { otp?: string; email?: string };
};

export default async function McpGuestLoginPage({
  searchParams,
}: McpGuestLoginPageProps) {
  const params = await Promise.resolve(searchParams ?? {});

  if (params.otp === "true") {
    const email = params.email?.trim();
    const signInUrl = email
      ? `${MCP_GUEST_SIGN_IN_PATH}?email=${encodeURIComponent(email)}`
      : MCP_GUEST_SIGN_IN_PATH;
    redirect(signInUrl);
  }

  redirect(MCP_GUEST_ENTRY_PATH);
}
