import type { Metadata } from "next";
import McpGuestConfirmationPage, {
  readMcpGuestQueryParams,
} from "@/components/admin/mcp-guest/McpGuestConfirmationPage";

export const metadata: Metadata = {
  title: "Request already processed | Asymmetrix",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: {
    company?: string | string[];
    email?: string | string[];
    work_email?: string | string[];
  };
}

export default function McpGuestAlreadyActionedPage({
  searchParams,
}: PageProps) {
  const { company, email } = readMcpGuestQueryParams(searchParams);

  return (
    <McpGuestConfirmationPage
      title="This request has already been processed"
      description="This link has already been used. If you believe this is an error, please contact the team."
      company={company}
      email={email}
    />
  );
}
