import dynamic from "next/dynamic";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";

// Dynamic code-splitting for below-the-fold sections to optimize initial mobile bundle
const Features = dynamic(() => import("@/components/landing/Features"));
const PolicySection = dynamic(() => import("@/components/landing/PolicySection"));
const DashboardSection = dynamic(() => import("@/components/landing/DashboardSection"));
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks"));
const TechStack = dynamic(() => import("@/components/landing/TechStack"));
const CTASection = dynamic(() => import("@/components/landing/CTASection"));
const LandingFooter = dynamic(() => import("@/components/landing/LandingFooter"));

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black text-white antialiased overflow-x-hidden selection:bg-cyan-400/30">
      {/* Fixed grid-texture backdrop with radial vignette mask */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
      
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <PolicySection />
        <DashboardSection />
        <HowItWorks />
        <TechStack />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
