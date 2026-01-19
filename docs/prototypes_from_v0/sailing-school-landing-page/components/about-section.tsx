interface AboutSectionProps {
  title: string
  text: string
}

export function AboutSection({ title, text }: AboutSectionProps) {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 text-balance">{title}</h2>
            <p className="text-lg text-foreground/80 leading-relaxed">{text}</p>
          </div>
          <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-2xl">
            <img
              src="/sailing-school-instructor-teaching-student-on-sail.jpg"
              alt="Sailing instruction"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
