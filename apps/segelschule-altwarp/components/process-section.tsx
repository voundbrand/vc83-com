"use client"

import { Calendar, Ship, Award } from "lucide-react"
import { EditableHeading, EditableParagraph } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"

interface ProcessStep {
  icon: "calendar" | "ship" | "award"
  title: string
  description: string
}

interface ProcessSectionProps {
  title: string
  subtitle: string
  steps: ProcessStep[]
}

const iconMap = {
  calendar: Calendar,
  ship: Ship,
  award: Award,
}

export function ProcessSection({ title, subtitle, steps }: ProcessSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="bg-primary py-24 px-4" style={{ background: "radial-gradient(ellipse at 30% 50%, #264332 0%, #1E3926 70%)" }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          {cmsEnabled ? (
            <>
              <EditableHeading
                page="home"
                section="process"
                contentKey="title"
                fallback={title}
                level={2}
                className="mb-4 font-serif text-4xl font-bold text-primary-foreground md:text-5xl text-balance"
              />
              <EditableParagraph
                page="home"
                section="process"
                contentKey="subtitle"
                fallback={subtitle}
                className="text-lg text-primary-foreground/80 md:text-xl text-pretty"
              />
            </>
          ) : (
            <>
              <h2 className="mb-4 font-serif text-4xl font-bold text-primary-foreground md:text-5xl text-balance">{title}</h2>
              <p className="text-lg text-primary-foreground/80 md:text-xl text-pretty">{subtitle}</p>
            </>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = iconMap[step.icon]
            return (
              <div key={index} className="relative text-center">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="rounded-full bg-[#FFF6C3] p-6">
                      <Icon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {index + 1}
                    </div>
                  </div>
                </div>
                {cmsEnabled ? (
                  <>
                    <EditableHeading
                      page="home"
                      section="process"
                      contentKey={`step_${index + 1}_title`}
                      fallback={step.title}
                      level={3}
                      className="mb-3 font-serif text-2xl font-bold text-primary-foreground"
                    />
                    <EditableParagraph
                      page="home"
                      section="process"
                      contentKey={`step_${index + 1}_description`}
                      fallback={step.description}
                      className="text-primary-foreground/80 leading-relaxed"
                    />
                  </>
                ) : (
                  <>
                    <h3 className="mb-3 font-serif text-2xl font-bold text-primary-foreground">{step.title}</h3>
                    <p className="text-primary-foreground/80 leading-relaxed">{step.description}</p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
