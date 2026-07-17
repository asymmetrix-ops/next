import Link from "next/link";
import Image from "next/image";

export default function McpGuestPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <div className="px-6 w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
