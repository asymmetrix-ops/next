"use client";

import { AuthProvider } from "@/components/contributor-crm/providers/AuthProvider";

export default function ContributorCrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
