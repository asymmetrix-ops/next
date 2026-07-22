import Link from "next/link";
import Image from "next/image";

function readQueryParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw?.trim()) return null;
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

export function readMcpGuestQueryParams(searchParams: {
  company?: string | string[];
  email?: string | string[];
  work_email?: string | string[];
}) {
  return {
    company: readQueryParam(searchParams.company),
    email:
      readQueryParam(searchParams.email) ??
      readQueryParam(searchParams.work_email),
  };
}

interface McpGuestConfirmationPageProps {
  title: string;
  description: string;
  company?: string | null;
  email?: string | null;
  showDetails?: boolean;
}

export default function McpGuestConfirmationPage({
  title,
  description,
  company,
  email,
  showDetails = true,
}: McpGuestConfirmationPageProps) {
  const hasDetails = showDetails && (company || email);

  return (
    <div className="min-h-screen bg-[#F9FAFC]">
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200 sm:px-6">
        <Link
          href="/"
          className="flex gap-3 items-center text-gray-900 no-underline"
        >
          <Image
            src="/icons/logo.svg"
            alt="Logo"
            width={40}
            height={40}
            style={{ borderRadius: "50%" }}
          />
          <span className="hidden font-bold tracking-wide sm:inline">
            ASYMMETRIX
          </span>
        </Link>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="px-6 w-full max-w-md text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 leading-relaxed">{description}</p>

          {hasDetails && (
            <dl className="mt-8 p-4 text-left bg-white rounded-lg border border-gray-200">
              {company && (
                <div className="py-2 border-b border-gray-100 last:border-b-0">
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="mt-1 text-gray-900">{company}</dd>
                </div>
              )}
              {email && (
                <div className="py-2">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-gray-900 break-all">{email}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
