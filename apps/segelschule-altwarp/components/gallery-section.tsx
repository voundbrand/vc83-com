interface GallerySectionProps {
  title: string
  subtitle: string
}

const galleryImages = [
  { src: "/hero-plattboden.jpg", alt: "Plattbodenschiff unter Segeln" },
  { src: "/people-on-boat.jpg", alt: "Menschen auf dem Boot" },
  { src: "/plattbodenschiff-detail.jpg", alt: "Traditionelles Plattbodenschiff" },
  { src: "/trainer-explaining.jpg", alt: "Trainer erklärt" },
  { src: "/training-maneuver.jpg", alt: "Segeltraining" },
  { src: "/group-course.jpg", alt: "Gruppenkurs" },
  { src: "/kapitaenshaus.jpg", alt: "Kapitänshaus" },
  { src: "/sunset-boat.jpg", alt: "Sonnenuntergang auf dem Haff" },
]

export function GallerySection({ title, subtitle }: GallerySectionProps) {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 text-balance">{title}</h2>
          <p className="text-xl text-muted-foreground text-balance">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-lg hover:scale-105 transition-transform duration-300 shadow-md"
            >
              <img src={image.src || "/placeholder.svg"} alt={image.alt} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
