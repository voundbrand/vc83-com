export function Gallery() {
  const images = [
    { src: "/historic-german-manor-exterior-with-gardens.jpg", alt: "Außenansicht" },
    { src: "/rustic-cafe-with-vintage-furniture.jpg", alt: "Café Bereich" },
    { src: "/bright-coworking-plants.png", alt: "Co-Working" },
    { src: "/museum-display-in-historic-room.jpg", alt: "Museum" },
    { src: "/elegant-bedroom-in-manor-house.jpg", alt: "Gästezimmer" },
    { src: "/beautiful-garden-of-historic-estate.jpg", alt: "Garten" },
  ]

  return (
    <section id="gallery" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance">
            Impressionen
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
            Ein Blick in unser historisches Anwesen
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative h-64 md:h-80 overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow group"
            >
              <img
                src={image.src || "/placeholder.svg"}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 text-white font-medium">{image.alt}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
