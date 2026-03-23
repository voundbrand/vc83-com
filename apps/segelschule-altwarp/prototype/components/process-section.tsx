"use client"

import { Calendar, Ship, Award } from "lucide-react"

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
  return (
    <section className="bg-sand py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-4xl font-bold text-primary md:text-5xl text-balance">{title}</h2>
          <p className="text-lg text-muted-foreground md:text-xl text-pretty">{subtitle}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = iconMap[step.icon]
            return (
              <div key={index} className="relative text-center">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="rounded-full bg-primary p-6">
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                  </div>
                </div>
                <h3 className="mb-3 font-serif text-2xl font-bold text-primary">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
