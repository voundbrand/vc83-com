interface GallerySectionProps {
  title: string
  subtitle: string
}

const galleryImages = [
  { src: "/gallery-1.jpg", query: "sailboat racing on Baltic Sea with spinnaker", alt: "Racing sailboat" },
  { src: "/gallery-2.jpg", query: "sailing students learning on deck sunny day", alt: "Learning sailing basics" },
  { src: "/gallery-3.jpg", query: "sunset sailing on calm Baltic Sea golden hour", alt: "Evening sail" },
  { src: "/gallery-4.jpg", query: "modern white sailing yacht at dock German harbor", alt: "Our fleet" },
  { src: "/gallery-5.jpg", query: "aerial view of sailboats on blue ocean water", alt: "From above" },
  { src: "/gallery-6.jpg", query: "sailing instructor teaching student at helm", alt: "One-on-one instruction" },
  { src: "/gallery-7.jpg", query: "Baltic Sea coastline beach with sailboats", alt: "Altwarp location" },
  { src: "/gallery-8.jpg", query: "group of happy sailing students on boat smiling", alt: "Our sailing community" },
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
