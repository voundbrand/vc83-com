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
      badge: t.pricing.badges.starter,
      included: t.pricing.schnupperIncluded,
    },
    {
      id: t.courses.grund.id,
      title: t.courses.grund.title,
      duration: t.courses.grund.duration,
      price: t.courses.grund.price,
      description: t.courses.grund.description,
      features: t.courses.grund.features,
      badge: t.pricing.badges.popular,
      included: t.pricing.grundIncluded,
    },
    {
      id: t.courses.intensiv.id,
      title: t.courses.intensiv.title,
      duration: t.courses.intensiv.duration,
      price: t.courses.intensiv.price,
      description: t.courses.intensiv.description,
      features: t.courses.intensiv.features,
      badge: t.pricing.badges.intensive,
      included: t.pricing.intensivIncluded,
    },
    {
      id: t.courses.praxis.id,
      title: t.courses.praxis.title,
      duration: t.courses.praxis.duration,
      price: t.courses.praxis.price,
      description: t.courses.praxis.description,
      features: t.courses.praxis.features,
      badge: t.pricing.badges.individual,
      included: t.pricing.praxisIncluded,
    },
  ]

  return (
    <>
      <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} forceScrolledStyle />

      <main className="min-h-screen pt-20">
        <section
          className="py-32 md:py-40 px-4"
          style={{ background: "#1E3926" }}
        >
          <div className="container mx-auto max-w-7xl text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6 text-balance">
              {t.pricing.pageTitle}
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto text-balance">
              {t.pricing.pageSubtitle}
            </p>
          </div>
        </section>

        {/* Flaschengruen → Elfenbein */}
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
                      {t.pricing.courseContent}
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
                      {t.pricing.included}
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
                    {t.pricing.allPricesTitle}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {t.pricing.allPricesDesc}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          </div>
        </section>

        {/* Elfenbein → Flaschengruen (footer) */}
        <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
      </main>

      <Footer content={t.footer} />
    </>
  )
}
