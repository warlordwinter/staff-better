import Hero from '@/components/landingPage/hero';
import HowItWorks from '@/components/landingPage/howItWorks';
import Industries from '@/components/landingPage/industries';
import CallToAction from '@/components/landingPage/callToAction';
import Footer from '@/components/footer';
import Navbar from '@/components/navBar';

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
