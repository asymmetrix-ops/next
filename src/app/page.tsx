import MarketSection from "@/components/MarketSection";
import SolutionSection from "@/components/SolutionSection";
import ReportsSection from "@/components/ReportsSection";
import Footer from "@/components/Footer";
import HomeHeader from "@/components/HomeHeader";
import HeroSection from "@/components/HeroSection";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomeHeader />
      <HeroSection />
      <MarketSection />
      <SolutionSection />
      <ReportsSection />
      <Footer />
    </div>
  );
}
