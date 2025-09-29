import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Bio } from "@/components/bio";
import { Resume } from "@/components/resume";
import { WhyPostHog } from "@/components/why-posthog";
import { ContactConvex } from "@/components/contact-convex";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Bio />
      <Resume />
      <WhyPostHog />
      <ContactConvex />
      <Footer />
    </main>
  );
}
