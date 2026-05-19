import { CookieBanner } from "@/components/cookie-banner";
import { HelpWidget } from "@/components/help-widget";
import { LandingCta } from "@/components/landing/cta";
import { LandingFeatures } from "@/components/landing/features";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHero } from "@/components/landing/hero";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/nav";
import { LandingPricing } from "@/components/landing/pricing";
import { LandingProductPreview } from "@/components/landing/product-preview";
import { LandingSocialProof } from "@/components/landing/social-proof";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <LandingNav />
      <main className="pb-16">
        <LandingHero />
        <LandingSocialProof />
        <LandingProductPreview />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingCta />
      </main>
      <HelpWidget />
      <CookieBanner />
      <LandingFooter />
    </div>
  );
}

