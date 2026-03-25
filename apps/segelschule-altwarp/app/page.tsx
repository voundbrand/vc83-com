"use client"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { PlattbodenSection } from "@/components/plattboden-section"
import { ProcessSection } from "@/components/process-section"
import { CoursesSection } from "@/components/courses-section"
import { SmallGroupsSection } from "@/components/small-groups-section"
import { RevierSection } from "@/components/revier-section"
import { LeisureSection } from "@/components/leisure-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { GallerySection } from "@/components/gallery-section"
import { TeamSection } from "@/components/team-section"
import { FAQSection } from "@/components/faq-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { WaveDivider } from "@/components/wave-divider"
import { EditableParagraph } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import { translations } from "@/lib/translations"
import { useLanguage } from "@/lib/language-context"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const cmsEnabled = isCmsEditorEnabled()

  const courses = [
    {
      cmsKey: "schnupper",
      id: t.courses.schnupper.id,
      title: t.courses.schnupper.title,
      duration: t.courses.schnupper.duration,
      price: t.courses.schnupper.price,
      description: t.courses.schnupper.description,
      features: t.courses.schnupper.features,
    },
    {
      cmsKey: "wochenende",
      id: t.courses.grund.id,
      title: t.courses.grund.title,
      duration: t.courses.grund.duration,
      price: t.courses.grund.price,
      description: t.courses.grund.description,
      features: t.courses.grund.features,
    },
    {
      cmsKey: "intensiv",
      id: t.courses.intensiv.id,
      title: t.courses.intensiv.title,
      duration: t.courses.intensiv.duration,
      price: t.courses.intensiv.price,
      description: t.courses.intensiv.description,
      features: t.courses.intensiv.features,
    },
    {
      cmsKey: "praxis",
      id: t.courses.praxis.id,
      title: t.courses.praxis.title,
      duration: t.courses.praxis.duration,
      price: t.courses.praxis.price,
      description: t.courses.praxis.description,
      features: t.courses.praxis.features,
    },
  ]

  return (
    <>
      <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} />

      <main>
        <HeroSection title={t.hero.title} subtitle={t.hero.subtitle} ctaText={t.hero.cta} scriptText={t.hero.scriptText} />

        {/* Hero → Flaschengrün (green wave curves into hero bottom) */}
        <WaveDivider fillColor="#1E3926" overlapTop />

        {/* Intro blurb – centered text in Flaschengrün zone */}
        <section className="bg-primary py-16 px-4">
          {cmsEnabled ? (
            <EditableParagraph
              page="home"
              section="hero"
              contentKey="description"
              fallback={t.hero.description}
              className="text-lg md:text-xl font-medium text-primary-foreground/70 max-w-2xl mx-auto text-center text-balance leading-relaxed italic"
            />
          ) : (
            <p className="text-lg md:text-xl font-medium text-primary-foreground/70 max-w-2xl mx-auto text-center text-balance leading-relaxed italic">
              {t.hero.description}
            </p>
          )}
        </section>

        {/* Flaschengrün → Elfenbein */}
        <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />

        <section id="about">
          <AboutSection title={t.about.title} text={t.about.text} />
        </section>

        {/* Plattboden continues in same Elfenbein zone as About */}
        <PlattbodenSection
          title={t.plattboden.title}
          text={t.plattboden.text}
          subtitle={t.plattboden.subtitle}
        />

        {/* Elfenbein → Flaschengrün */}
        <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
        <ProcessSection title={t.process.title} subtitle={t.process.subtitle} steps={t.process.steps} />

        {/* Flaschengrün → Elfenbein */}
        <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />
        <CoursesSection
          title={t.courses.title}
          subtitle={t.courses.subtitle}
          courses={courses}
          buttonText={t.courses.button}
        />

        {/* Elfenbein → Flaschengrün */}
        <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
        <SmallGroupsSection title={t.smallGroups.title} text={t.smallGroups.text} />

        {/* Revier – has internal top/bottom waves over its background image */}
        <RevierSection title={t.revier.title} text={t.revier.text} />

        <LeisureSection
          title={t.leisure.title}
          text={t.leisure.text}
          buttonText={t.leisure.button}
        />

        {/* Elfenbein → Flaschengrün */}
        <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
        <TestimonialsSection title={t.testimonials.title} scriptText={t.testimonials.scriptText} reviews={t.testimonials.reviews} />

        {/* Flaschengrün → Elfenbein */}
        <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />
        <section id="gallery">
          <GallerySection title={t.gallery.title} subtitle={t.gallery.subtitle} />
        </section>

        {/* Elfenbein → Background */}
        <WaveDivider fillColor="#FFFBEA" bgColor="#FFF6C3" />

        <section id="team">
          <TeamSection title={t.team.title} subtitle={t.team.subtitle} members={t.team.members} />
        </section>

        {/* CTA has internal top/bottom waves over the background image */}
        <CTASection title={t.cta.title} description={t.cta.description} buttonText={t.cta.button} />
        <FAQSection title={t.faq.title} subtitle={t.faq.subtitle} faqs={t.faq.items} />

        {/* Elfenbein → Flaschengrün */}
        <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
      </main>

      <Footer content={t.footer} />
      <Toaster />
    </>
  )
}
