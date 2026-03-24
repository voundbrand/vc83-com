"use client"

import { EditableHeading, EditableParagraph } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"

interface SmallGroupsSectionProps {
  title: string
  text: string
}

export function SmallGroupsSection({ title, text }: SmallGroupsSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="bg-primary py-24 px-4" style={{ background: "radial-gradient(ellipse at 70% 50%, #264332 0%, #1E3926 70%)" }}>
      <div className="container mx-auto max-w-4xl text-center">
        {cmsEnabled ? (
          <>
            <EditableHeading
              page="home"
              section="smallGroups"
              contentKey="title"
              fallback={title}
              level={2}
              className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-6 text-balance"
            />
            <EditableParagraph
              page="home"
              section="smallGroups"
              contentKey="text"
              fallback={text}
              className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed max-w-3xl mx-auto"
            />
          </>
        ) : (
          <>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-6 text-balance">
              {title}
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed max-w-3xl mx-auto">
              {text}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
