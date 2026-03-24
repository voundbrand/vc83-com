"use client"

import { useLanguage } from "@/lib/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Info } from "lucide-react"
import Link from "next/link"
import { translations } from "@/lib/translations"
import { WaveDivider } from "@/components/wave-divider"

export default function PricingPage() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  const pricingDetails = [
    {
      id: t.courses.schnupper.id,
      title: t.courses.schnupper.title,
      duration: t.courses.schnupper.duration,
      price: t.courses.schnupper.price,
      description: t.courses.schnupper.description,
      features: t.courses.schnupper.features,
      badge: language === "de" ? "Einstieg" : language === "en" ? "Starter" : language === "nl" ? "Instap" : "Iistig",
      included: [
        language === "de"
          ? "Alle Sicherheitsausrüstung"
          : language === "en"
            ? "All safety equipment"
            : language === "nl"
              ? "Alle veiligheidsuitrusting"
              : "Alli Sicherheitsusrüstig",
        language === "de"
          ? "Segelausrüstung"
          : language === "en"
            ? "Sailing equipment"
            : language === "nl"
              ? "Zeiluitrusting"
              : "Segelusrüstig",
        language === "de"
          ? "Versicherung"
          : language === "en"
            ? "Insurance"
            : language === "nl"
              ? "Verzekering"
              : "Versicherig",
        language === "de" ? "Getränke" : language === "en" ? "Beverages" : language === "nl" ? "Drankjes" : "Getränk",
      ],
    },
    {
      id: t.courses.grund.id,
      title: t.courses.grund.title,
      duration: t.courses.grund.duration,
      price: t.courses.grund.price,
      description: t.courses.grund.description,
      features: t.courses.grund.features,
      badge:
        language === "de"
          ? "Beliebt"
          : language === "en"
            ? "Popular"
            : language === "nl"
              ? "Populair"
              : "Beliebt",
      included: [
        language === "de"
          ? "Alle Materialien & Ausrüstung"
          : language === "en"
            ? "All materials & equipment"
            : language === "nl"
              ? "Alle materialen & uitrusting"
              : "Alli Materiale & Usrüstig",
        language === "de"
          ? "Kursbuch & Lehrmaterial"
          : language === "en"
            ? "Course book & materials"
            : language === "nl"
              ? "Cursusboek & lesmateriaal"
              : "Kursbuch & Lehrmaterial",
        language === "de"
          ? "Segelschule T-Shirt"
          : language === "en"
            ? "Sailing school T-Shirt"
            : language === "nl"
              ? "Zeilschool T-Shirt"
              : "Segelschuel T-Shirt",
        language === "de"
          ? "Verpflegung"
          : language === "en"
            ? "Catering"
            : language === "nl"
              ? "Catering"
              : "Verpflegig",
      ],
    },
    {
      id: t.courses.sbf.id,
      title: t.courses.sbf.title,
      duration: t.courses.sbf.duration,
      price: t.courses.sbf.price,
      description: t.courses.sbf.description,
      features: t.courses.sbf.features,
      badge:
        language === "de"
          ? "Flexibel"
          : language === "en"
            ? "Flexible"
            : language === "nl"
              ? "Flexibel"
              : "Flexibel",
      included: [
        language === "de"
          ? "10 Stunden auf dem Wasser"
          : language === "en"
            ? "10 hours on the water"
            : language === "nl"
              ? "10 uur op het water"
              : "10 Stund ufem Wasser",
        language === "de"
          ? "1 Jahr gültig"
          : language === "en"
            ? "Valid for 1 year"
            : language === "nl"
              ? "1 jaar geldig"
              : "1 Jahr gültig",
        language === "de"
          ? "Übertragbar auf Freunde"
          : language === "en"
            ? "Transferable to friends"
            : language === "nl"
              ? "Overdraagbaar aan vrienden"
              : "Übertragbar uf Fründe",
        language === "de"
          ? "Flexibel buchbar"
          : language === "en"
            ? "Book flexibly"
            : language === "nl"
              ? "Flexibel te boeken"
              : "Flexibel buechbar",
      ],
    },
    {
      id: t.courses.advanced.id,
      title: t.courses.advanced.title,
      duration: t.courses.advanced.duration,
      price: t.courses.advanced.price,
      description: t.courses.advanced.description,
      features: t.courses.advanced.features,
      badge: language === "de" ? "Intensiv" : language === "en" ? "Intensive" : language === "nl" ? "Intensief" : "Intensiv",
      included: [
        language === "de"
          ? "Vollständige Ausbildung"
          : language === "en"
            ? "Complete training"
            : language === "nl"
              ? "Volledige opleiding"
              : "Vollständigi Usbildig",
        language === "de"
          ? "Alle Lehrbücher & Materialien"
          : language === "en"
            ? "All textbooks & materials"
            : language === "nl"
              ? "Alle leerboeken & materialen"
              : "Alli Lehrbüecher & Materiale",
        language === "de"
          ? "Segelschule T-Shirt"
          : language === "en"
            ? "Sailing school T-Shirt"
            : language === "nl"
              ? "Zeilschool T-Shirt"
              : "Segelschuel T-Shirt",
        language === "de"
          ? "Prüfungsvorbereitung"
          : language === "en"
            ? "Exam preparation"
            : language === "nl"
              ? "Examenvoorbereiding"
              : "Prüefigsvorbereitung",
      ],
    },
  ]

  return (
    <>
      <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} forceScrolledStyle />

      <main className="min-h-screen pt-20">
        <section
          className="py-16 md:py-24 px-4"
          style={{ background: "linear-gradient(to bottom, #FFFBEA 0%, #1E3926 30%)" }}
        >
          <div className="container mx-auto max-w-7xl text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6 text-balance">
              {language === "de"
                ? "Preise & Kurse"
                : language === "en"
                  ? "Pricing & Courses"
                  : language === "nl"
                    ? "Prijzen & Cursussen"
                    : "Priis & Kurs"}
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto text-balance">
              {language === "de"
                ? "Transparente Preise, faire Konditionen – alle Kosten inklusive ohne versteckte Gebühren"
                : language === "en"
                  ? "Transparent prices, fair conditions – all costs included without hidden fees"
                  : language === "nl"
                    ? "Transparante prijzen, eerlijke voorwaarden – alle kosten inbegrepen zonder verborgen kosten"
                    : "Transparänti Priis, fairi Konditione – alli Koste inklusive ohni versteckti Gebüehre"}
            </p>
          </div>
        </section>

        {/* Flaschengrün → Elfenbein */}
        <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />

        <section className="py-16 px-4 bg-secondary">
          <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {pricingDetails.map((course, index) => (
              <Card
                key={index}
                className={`flex flex-col hover:shadow-2xl transition-all duration-300 ${
                  index === 1 ? "border-2 border-primary" : ""
                }`}
              >
                <CardHeader className="space-y-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-3xl font-serif text-primary">{course.title}</CardTitle>
                    <Badge variant={index === 1 ? "default" : "secondary"} className="font-sans text-sm px-3 py-1">
                      {course.badge}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-primary">{course.price}</span>
                    <span className="text-base text-muted-foreground">/ {course.duration.toLowerCase()}</span>
                  </div>
                  <CardDescription className="text-lg leading-relaxed">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-6">
                  <div>
                    <h4 className="font-semibold text-base uppercase tracking-wide mb-4 text-primary">
                      {language === "de"
                        ? "Kursinhalte"
                        : language === "en"
                          ? "Course Content"
                          : language === "nl"
                            ? "Cursusinhoud"
                            : "Kursinhalt"}
                    </h4>
                    <ul className="space-y-3">
                      {course.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-base text-foreground/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-base uppercase tracking-wide mb-4 text-primary">
                      {language === "de"
                        ? "Inklusive"
                        : language === "en"
                          ? "Included"
                          : language === "nl"
                            ? "Inbegrepen"
                            : "Inklusive"}
                    </h4>
                    <ul className="space-y-3">
                      {course.included.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-base text-foreground/70">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="pt-6">
                  <Link href={`/booking?course=${course.id}`} className="w-full">
                    <Button
                      className="w-full text-lg py-6 bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button"
                    >
                      {t.courses.button}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <Card className="bg-accent/10 border-accent/20">
            <CardHeader>
              <div className="flex items-start gap-3">
                <Info className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <CardTitle className="text-xl font-serif mb-2">
                    {language === "de"
                      ? "Alle Preise verstehen sich inklusive"
                      : language === "en"
                        ? "All prices include"
                        : language === "nl"
                          ? "Alle prijzen zijn inclusief"
                          : "Alli Priis verstönd sich inklusive"}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {language === "de"
                      ? "• Sämtliche Lehr- und Unterrichtsmaterialien • Komplette Segel- und Sicherheitsausrüstung • Versicherung während des Kurses • Getränke und Verpflegung • Bei mehrtägigen Kursen inklusive T-Shirt • Keine versteckten Gebühren – transparente Preisgestaltung"
                      : language === "en"
                        ? "• All teaching and instructional materials • Complete sailing and safety equipment • Insurance during the course • Beverages and catering • T-Shirt included with multi-day courses • No hidden fees – transparent pricing"
                        : language === "nl"
                          ? "• Alle les- en onderwijsmaterialen • Volledige zeil- en veiligheidsuitrusting • Verzekering tijdens de cursus • Drankjes en catering • T-Shirt inbegrepen bij meerdaagse cursussen • Geen verborgen kosten – transparante prijzen"
                          : "• Sämtlichi Lehr- und Unterrichtsmateriale • Kompletti Segel- und Sicherheitsusrüstig • Versicherig während em Kurs • Getränk und Verpflegig • Bi mehrtägige Kurs inklusive T-Shirt • Kei versteckti Gebüehre – transparänti Priisgestaltig"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          </div>
        </section>

        {/* Elfenbein → Flaschengrün (footer) */}
        <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
      </main>

      <Footer content={t.footer} />
    </>
  )
}
