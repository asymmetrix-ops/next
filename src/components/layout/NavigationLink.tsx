"use client";

import Link from "next/link";

interface NavigationLinkProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export default function NavigationLink({
  href,
  children,
  isActive = false,
}: NavigationLinkProps) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors duration-200 ${
        isActive ? "text-primary-600" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}
