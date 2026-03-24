"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EditableHeading, EditableParagraph, EditableText } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"

interface Review {
  name: string
  text: string
  rating: number
}

interface TestimonialsSectionProps {
  title: string
  scriptText: string
  reviews: Review[]
}

export function TestimonialsSection({ title, scriptText, reviews }: TestimonialsSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="py-28 px-4 bg-primary" style={{ background: "radial-gradient(ellipse at 70% 40%, #264332 0%, #1E3926 70%)" }}>
      <div className="container mx-auto max-w-7xl">
        {cmsEnabled ? (
          <>
            <EditableParagraph
              page="home"
              section="testimonials"
              contentKey="scriptText"
              fallback={scriptText}
              className="font-script text-4xl md:text-5xl lg:text-6xl text-[#E2C786] mb-3 text-center drop-shadow-md"
            />
            <EditableHeading
              page="home"
              section="testimonials"
              contentKey="title"
              fallback={title}
              level={2}
              className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-16 text-center text-balance"
            />
          </>
        ) : (
          <>
            <p className="font-script text-4xl md:text-5xl lg:text-6xl text-[#E2C786] mb-3 text-center drop-shadow-md">
              {scriptText}
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-16 text-center text-balance">
              {title}
            </h2>
          </>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <Card key={index} className="bg-[#FFFBEA] border-[#E2C786] hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-[#E2C786] text-[#E2C786]" />
                  ))}
                </div>
                <div className="relative pl-5 mb-6">
                  <span className="font-script text-4xl text-[#E2C786] absolute -top-2 -left-1 leading-none select-none">&ldquo;</span>
                  <div className="text-foreground/80 leading-relaxed italic">
                    {cmsEnabled ? (
                      <EditableText
                        page="home"
                        section="testimonials"
                        contentKey={`review_${index + 1}_text`}
                        fallback={review.text}
                      />
                    ) : (
                      review.text
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={`/abstract-portrait.png?height=40&width=40&query=portrait of ${review.name}`} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {review.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-foreground">
                      {cmsEnabled ? (
                        <EditableText
                          page="home"
                          section="testimonials"
                          contentKey={`review_${index + 1}_name`}
                          fallback={review.name}
                        />
                      ) : (
                        review.name
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
