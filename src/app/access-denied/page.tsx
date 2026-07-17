import type { Metadata } from "next";
import Link from "next/link";
import McpGuestPageShell from "@/components/mcp-guest/McpGuestPageShell";

export const metadata: Metadata = {
  title: "Access denied | Asymmetrix",
  robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
  return (
    <McpGuestPageShell>
      <div className="text-center">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">Access denied</h1>
        <p className="mb-8 text-gray-600 leading-relaxed">
          Your account does not have access to the platform. If you believe this
          is an error, please contact{" "}
          <a
            href="mailto:asymmetrix@asymmetrixintelligence.com"
            className="text-blue-600 hover:underline"
          >
            asymmetrix@asymmetrixintelligence.com
          </a>
          .
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 no-underline"
        >
          Back to login
        </Link>
      </div>
    </McpGuestPageShell>
  );
}
