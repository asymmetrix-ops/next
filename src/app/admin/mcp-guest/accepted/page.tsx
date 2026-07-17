import type { Metadata } from "next";
import McpGuestConfirmationPage, {
  readMcpGuestQueryParams,
} from "@/components/admin/mcp-guest/McpGuestConfirmationPage";

export const metadata: Metadata = {
  title: "Request approved | Asymmetrix",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: {
    company?: string | string[];
    email?: string | string[];
    work_email?: string | string[];
  };
}

export default function McpGuestAcceptedPage({ searchParams }: PageProps) {
  const { company, email } = readMcpGuestQueryParams(searchParams);

  return (
    <McpGuestConfirmationPage
      title="✅ Request approved"
      description="The MCP Guest access request has been approved. The applicant will receive a follow-up email shortly."
      company={company}
      email={email}
    />
  );
}
