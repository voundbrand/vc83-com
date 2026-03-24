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
    <section className="bg-primary py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-4xl font-bold text-primary-foreground md:text-5xl text-balance">{title}</h2>
          <p className="text-lg text-primary-foreground/80 md:text-xl text-pretty">{subtitle}</p>
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
                <h3 className="mb-3 font-serif text-2xl font-bold text-primary-foreground">{step.title}</h3>
                <p className="text-primary-foreground/80 leading-relaxed">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
