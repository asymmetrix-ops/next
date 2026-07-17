import type { Metadata } from "next";
import McpGuestConfirmationPage, {
  readMcpGuestQueryParams,
} from "@/components/admin/mcp-guest/McpGuestConfirmationPage";

export const metadata: Metadata = {
  title: "Request rejected | Asymmetrix",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: {
    company?: string | string[];
    email?: string | string[];
    work_email?: string | string[];
  };
}

export default function McpGuestRejectedPage({ searchParams }: PageProps) {
  const { company, email } = readMcpGuestQueryParams(searchParams);

  return (
    <McpGuestConfirmationPage
      title="❌ Request rejected"
      description="The MCP Guest access request has been rejected. No further action is required."
      company={company}
      email={email}
    />
  );
}
