import McpGuestSignInFlow from "@/components/mcp-guest/McpGuestSignInFlow";

type McpGuestSignInPageProps = {
  searchParams?: Promise<{ email?: string }> | { email?: string };
};

export default async function McpGuestSignInPage({
  searchParams,
}: McpGuestSignInPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const initialWorkEmail = params.email?.trim() ?? "";

  return <McpGuestSignInFlow initialWorkEmail={initialWorkEmail} />;
}
