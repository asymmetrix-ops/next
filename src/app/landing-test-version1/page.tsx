import { Navbar1 } from "./components/Navbar1";
import { PlatformHero } from "./components/PlatformHero";
import { Logo3 } from "./components/Logo3";
import { Layout184 } from "./components/Layout184";
import { Layout485 } from "./components/Layout485";
import { Coverage } from "./components/Coverage";
import { Logo3_1 } from "./components/Logo3_1";
import { Testimonial1 } from "./components/Testimonial1";
import { Blog16 } from "./components/Blog16";
import { Cta15 } from "./components/Cta15";
import { Footer1 } from "./components/Footer1";

export const metadata = {
  title: "Asymmetrix | Landing Test v1",
  description:
    "Intelligence on the Data & Analytics Market — rebrand landing page test.",
};

export default function LandingTestVersion1Page() {
  return (
    <div>
      <Navbar1 />
      <PlatformHero />
      <Logo3 />
      <Layout184 />
      <Layout485 />
      <Coverage />
      <Logo3_1 />
      <Testimonial1 />
      <Blog16 />
      <Cta15 />
      <Footer1 />
    </div>
  );
}
