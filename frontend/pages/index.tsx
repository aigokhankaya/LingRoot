import Header from "../src/components/Header";
import Hero from "../src/components/HeroSection";
import DemoVideoTabs from "../src/components/DemoSection";
import HowItWorks from "../src/components/HowItWorksSection";
import CTASection from "../src/components/FinalCtaSection";
import Footer from "../src/components/Footer";

export default function HomePage() {
  return (
    <main>
      <Header />
      <Hero />
      <DemoVideoTabs />
      <HowItWorks />
      <CTASection />
      <Footer />
    </main>
  );
} 