import ContributorAdminRouteGuard from "@/components/contributor-crm/ContributorAdminRouteGuard";

export default function EmailPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContributorAdminRouteGuard>{children}</ContributorAdminRouteGuard>;
}
