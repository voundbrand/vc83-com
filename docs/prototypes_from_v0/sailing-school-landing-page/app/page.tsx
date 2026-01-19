"use client"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { ProcessSection } from "@/components/process-section"
import { CoursesSection } from "@/components/courses-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { GallerySection } from "@/components/gallery-section"
import { TeamSection } from "@/components/team-section"
import { FAQSection } from "@/components/faq-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { translations } from "@/lib/translations"
import { useLanguage } from "@/lib/language-context"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  const courses = [
    {
      id: t.courses.schnupper.id,
      title: t.courses.schnupper.title,
      duration: t.courses.schnupper.duration,
      price: t.courses.schnupper.price,
      description: t.courses.schnupper.description,
      features: t.courses.schnupper.features,
    },
    {
      id: t.courses.grund.id,
      title: t.courses.grund.title,
      duration: t.courses.grund.duration,
      price: t.courses.grund.price,
      description: t.courses.grund.description,
      features: t.courses.grund.features,
    },
    {
      id: t.courses.sbf.id,
      title: t.courses.sbf.title,
      duration: t.courses.sbf.duration,
      price: t.courses.sbf.price,
      description: t.courses.sbf.description,
      features: t.courses.sbf.features,
    },
    {
      id: t.courses.advanced.id,
      title: t.courses.advanced.title,
      duration: t.courses.advanced.duration,
      price: t.courses.advanced.price,
      description: t.courses.advanced.description,
      features: t.courses.advanced.features,
    },
  ]

  return (
    <>
      <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} />

      <main>
        <HeroSection title={t.hero.title} subtitle={t.hero.subtitle} ctaText={t.hero.cta} />

        <section id="about">
          <AboutSection title={t.about.title} text={t.about.text} />
        </section>

        <ProcessSection title={t.process.title} subtitle={t.process.subtitle} steps={t.process.steps} />

        <CoursesSection
          title={t.courses.title}
          subtitle={t.courses.subtitle}
          courses={courses}
          buttonText={t.courses.button}
        />

        <TestimonialsSection title={t.testimonials.title} reviews={t.testimonials.reviews} />

        <section id="gallery">
          <GallerySection title={t.gallery.title} subtitle={t.gallery.subtitle} />
        </section>

        <section id="team">
          <TeamSection title={t.team.title} subtitle={t.team.subtitle} members={t.team.members} />
        </section>

        <FAQSection title={t.faq.title} subtitle={t.faq.subtitle} faqs={t.faq.items} />

        <CTASection title={t.cta.title} description={t.cta.description} buttonText={t.cta.button} />
      </main>

      <Footer content={t.footer} />
      <Toaster />
    </>
  )
}
