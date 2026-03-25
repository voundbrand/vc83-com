"use client"

import { Waves, TreePine, UtensilsCrossed, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableHeading, EditableParagraph, EditableText } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import Link from "next/link"
import type { Language } from "@/lib/translations"
import { useLanguage } from "@/lib/language-context"

interface LeisureSectionProps {
  title: string
  text: string
  buttonText: string
}

const activities: { icon: typeof Waves; labels: Record<Language, string> }[] = [
  { icon: Waves, labels: { de: "Kajak fahren", en: "Kayaking", nl: "Kajakken", ch: "Kajak fahre" } },
  { icon: TreePine, labels: { de: "Waldspaziergänge", en: "Forest walks", nl: "Boswandelingen", ch: "Waldspaziergäng" } },
  { icon: UtensilsCrossed, labels: { de: "Gesundes Essen", en: "Healthy food", nl: "Gezond eten", ch: "Gsunds Ässe" } },
  { icon: Home, labels: { de: "Kapitänshaus", en: "Kapitänshaus", nl: "Kapitänshaus", ch: "Kapitänshuus" } },
]

export function LeisureSection({ title, text, buttonText }: LeisureSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()
  const { language } = useLanguage()

  return (
    <section className="py-28 px-4 bg-secondary">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          {cmsEnabled ? (
            <>
              <EditableHeading
                page="home"
                section="leisure"
                contentKey="title"
                fallback={title}
                level={2}
                className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 text-balance"
              />
              <EditableParagraph
                page="home"
                section="leisure"
                contentKey="text"
                fallback={text}
                className="text-lg text-foreground/80 leading-relaxed max-w-3xl mx-auto mb-8"
              />
            </>
          ) : (
            <>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 text-balance">
                {title}
              </h2>
              <p className="text-lg text-foreground/80 leading-relaxed max-w-3xl mx-auto mb-8">
                {text}
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {activities.map((activity, index) => {
            const Icon = activity.icon
            const fallbackLabel = activity.labels[language]
            return (
              <div key={index} className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary p-5">
                    <Icon className="h-8 w-8 text-[#FFF6C3]" />
                  </div>
                </div>
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="leisure"
                    contentKey={`activity_${index + 1}_label`}
                    fallback={fallbackLabel}
                    className="font-medium text-primary"
                  />
                ) : (
                  <p className="font-medium text-primary">{fallbackLabel}</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <Link href="https://www.kapitaenshaus-altwarp.de" target="_blank" rel="noopener noreferrer">
            <Button className="bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button px-8 py-3 text-lg">
              {cmsEnabled ? (
                <EditableText
                  page="home"
                  section="leisure"
                  contentKey="button"
                  fallback={buttonText}
                />
              ) : (
                buttonText
              )}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
