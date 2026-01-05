import SectorDetailPage from "./_components/SectorDetailClient";

// Skip server-side data fetching entirely.
// Vercel → Xano is slow (~8s), but Browser → Xano is fast (~1.5s).
// The client component will fetch directly from Xano for best performance.
export default function SectorPage() {
  return <SectorDetailPage />;
}
