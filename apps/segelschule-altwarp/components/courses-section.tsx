"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface Course {
  title: string
  duration: string
  price: string
  description: string
  features: string[]
  id?: string
}

interface CoursesSectionProps {
  title: string
  subtitle: string
  courses: Course[]
  buttonText: string
}

export function CoursesSection({ title, subtitle, courses, buttonText }: CoursesSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const coursesPerView = 3

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % courses.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + courses.length) % courses.length)
  }

  const getVisibleCourses = () => {
    const visible = []
    for (let i = 0; i < coursesPerView; i++) {
      visible.push(courses[(currentIndex + i) % courses.length])
    }
    return visible
  }

  const visibleCourses = getVisibleCourses()

  return (
    <section id="courses" className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 text-balance">{title}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">{subtitle}</p>
        </div>

        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-all hover:scale-110 hidden lg:flex items-center justify-center"
            aria-label="Previous course"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-all hover:scale-110 hidden lg:flex items-center justify-center"
            aria-label="Next course"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Course Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleCourses.map((course, index) => {
              const actualIndex = (currentIndex + index) % courses.length
              return (
                <Card key={actualIndex} className="flex flex-col hover:shadow-xl transition-shadow bg-card">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-2xl font-serif text-primary">{course.title}</CardTitle>
                      <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                        {course.duration}
                      </span>
                    </div>
                    <CardDescription className="text-base">{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="text-4xl font-bold text-primary mb-6">{course.price}</div>
                    <ul className="space-y-3">
                      {course.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="text-foreground/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/booking?course=${course.id || actualIndex}`} className="w-full">
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shimmer-button">
                        {buttonText}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {courses.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? "w-8 bg-primary" : "w-2 bg-primary/30 hover:bg-primary/50"
                }`}
                aria-label={`Go to course ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
