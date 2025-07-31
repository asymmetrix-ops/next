import MarketSection from "@/components/MarketSection";
import SolutionSection from "@/components/SolutionSection";
import ReportsSection from "@/components/ReportsSection";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <MarketSection />
      <SolutionSection />
      <ReportsSection />
      <Footer />
    </div>
  );
}
