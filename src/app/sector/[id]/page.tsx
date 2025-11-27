import SectorDetailPage from "./_components/SectorDetailClient";

export const dynamic = "force-dynamic";

export default function SectorPage() {
  // Let the client-side component progressively fetch all sector data
  // so navigation to this page is not blocked by server-side API calls.
  return <SectorDetailPage />;
}
