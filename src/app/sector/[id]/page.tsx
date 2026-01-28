import SectorDetailPage from "./_components/SectorDetailClient";

type PageProps = {
  params: { id: string };
};

// NO server-side data fetching - instant page navigation.
// All data loads client-side with progressive rendering (skeletons → data).
// This gives best perceived performance for a data marketplace.
export default function SectorPage({ params }: PageProps) {
  // Pass sector ID via params, client handles all data fetching
  void params; // acknowledge params (used by client via useParams)
  return <SectorDetailPage />;
}
