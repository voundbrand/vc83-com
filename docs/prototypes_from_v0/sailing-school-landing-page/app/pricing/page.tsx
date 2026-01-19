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
      badge: language === "de" ? "Beliebt" : language === "en" ? "Popular" : language === "nl" ? "Populair" : "Beliebt",
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
          ? "Am meisten gebucht"
          : language === "en"
            ? "Most booked"
            : language === "nl"
              ? "Meest geboekt"
              : "Am meiste bucht",
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
          ? "Zertifikat"
          : language === "en"
            ? "Certificate"
            : language === "nl"
              ? "Certificaat"
              : "Zertifikat",
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
          ? "Offiziell"
          : language === "en"
            ? "Official"
            : language === "nl"
              ? "Officieel"
              : "Offiziell",
      included: [
        language === "de"
          ? "Vollständiges Ausbildungspaket"
          : language === "en"
            ? "Complete training package"
            : language === "nl"
              ? "Volledig opleidingspakket"
              : "Vollständigs Usbildigspaket",
        language === "de"
          ? "Alle Lehrbücher & Materialien"
          : language === "en"
            ? "All textbooks & materials"
            : language === "nl"
              ? "Alle leerboeken & materialen"
              : "Alli Lehrbüecher & Materiale",
        language === "de"
          ? "Prüfungsgebühren exklusive"
          : language === "en"
            ? "Exam fees excluded"
            : language === "nl"
              ? "Examenkosten exclusief"
              : "Prüefigsgebüehre exklusive",
        language === "de"
          ? "Offizieller Führerschein"
          : language === "en"
            ? "Official license"
            : language === "nl"
              ? "Officieel vaarbewijs"
              : "Offizielle Füehrerschiin",
      ],
    },
    {
      id: t.courses.advanced.id,
      title: t.courses.advanced.title,
      duration: t.courses.advanced.duration,
      price: t.courses.advanced.price,
      description: t.courses.advanced.description,
      features: t.courses.advanced.features,
      badge: language === "de" ? "Profi" : language === "en" ? "Pro" : language === "nl" ? "Pro" : "Profi",
      included: [
        language === "de"
          ? "Erweiterte Manöver-Techniken"
          : language === "en"
            ? "Advanced maneuver techniques"
            : language === "nl"
              ? "Geavanceerde manoeuvertechnieken"
              : "Erwiiterti Manöver-Technike",
        language === "de"
          ? "Navigation & Wetteranalyse"
          : language === "en"
            ? "Navigation & weather analysis"
            : language === "nl"
              ? "Navigatie & weeranalyse"
              : "Navigation & Wätteranalyse",
        language === "de"
          ? "Regatta-Taktiken"
          : language === "en"
            ? "Regatta tactics"
            : language === "nl"
              ? "Regatta-tactieken"
              : "Regatta-Taktike",
        language === "de"
          ? "Performance-Optimierung"
          : language === "en"
            ? "Performance optimization"
            : language === "nl"
              ? "Prestatie-optimalisatie"
              : "Performance-Optimierig",
      ],
    },
  ]

  return (
    <>
      <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} forceScrolledStyle />

      <main className="min-h-screen bg-background pt-24">
        <div className="container mx-auto px-4 py-16 max-w-7xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-primary mb-6 text-balance">
              {language === "de"
                ? "Preise & Kurse"
                : language === "en"
                  ? "Pricing & Courses"
                  : language === "nl"
                    ? "Prijzen & Cursussen"
                    : "Priis & Kurs"}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
              {language === "de"
                ? "Transparente Preise, faire Konditionen – alle Kosten inklusive ohne versteckte Gebühren"
                : language === "en"
                  ? "Transparent prices, fair conditions – all costs included without hidden fees"
                  : language === "nl"
                    ? "Transparante prijzen, eerlijke voorwaarden – alle kosten inbegrepen zonder verborgen kosten"
                    : "Transparänti Priis, fairi Konditione – alli Koste inklusive ohni versteckti Gebüehre"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-6xl mx-auto">
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
                      className={`w-full text-lg py-6 shimmer-button ${
                        index === 1 ? "bg-primary hover:bg-primary/90" : "bg-primary/90 hover:bg-primary"
                      }`}
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
                      ? "• Sämtliche Lehr- und Unterrichtsmaterialien • Komplette Segel- und Sicherheitsausrüstung • Versicherung während des Kurses • Getränke und Verpflegung • Hinweis: Bei SBF-Kursen sind offizielle Prüfungsgebühren (ca. €150) separat zu entrichten • Keine versteckten Gebühren – transparente Preisgestaltung"
                      : language === "en"
                        ? "• All teaching and instructional materials • Complete sailing and safety equipment • Insurance during the course • Beverages and catering • Note: For SBF courses, official exam fees (approx. €150) are paid separately • No hidden fees – transparent pricing"
                        : language === "nl"
                          ? "• Alle les- en onderwijsmaterialen • Volledige zeil- en veiligheidsuitrusting • Verzekering tijdens de cursus • Drankjes en catering • Let op: Voor SBF-cursussen worden officiële examenkosten (ca. €150) apart betaald • Geen verborgen kosten – transparante prijzen"
                          : "• Sämtlichi Lehr- und Unterrichtsmateriale • Kompletti Segel- und Sicherheitsusrüstig • Versicherig während em Kurs • Getränk und Verpflegig • Hinwiis: Bi SBF-Kurs sind offizielle Prüefigsgebüehre (ca. €150) separat z'zahle • Kei versteckti Gebüehre – transparänti Priisgestaltig"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </main>

      <Footer content={t.footer} />
    </>
  )
}
