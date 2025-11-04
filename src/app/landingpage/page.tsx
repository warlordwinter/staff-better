import Hero from "@/components/landingPage/hero";
import HowItWorks from "@/components/landingPage/howItWorks";
import Features from "@/components/landingPage/features";
import Industries from "@/components/landingPage/industries";
import WhyChoose from "@/components/landingPage/whyChoose";
import CallToAction from "@/components/landingPage/callToAction";
import Footer from "@/components/ui/footer";
import Navbar from "@/components/ui/navBar";

export default async function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Industries />
      <WhyChoose />
      <CallToAction />
      <Footer />
    </>
  );
}
