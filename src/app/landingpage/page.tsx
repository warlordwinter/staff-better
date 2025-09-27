import Hero from "@/components/landingPage/hero";
import HowItWorks from "@/components/landingPage/howItWorks";
import Industries from "@/components/landingPage/industries";
import CallToAction from "@/components/landingPage/callToAction";
import Footer from "@/components/ui/footer";
import Navbar from "@/components/ui/navBar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Industries />
      <CallToAction />
      <Footer />
    </>
  );
}
