export function About() {
  return (
    <section id="about" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
              Willkommen im Rittergut Damerow
            </h2>
            <div className="space-y-4 text-foreground/80 leading-relaxed">
              <p>
                Das historische Rittergut Damerow verbindet jahrhundertealte Geschichte mit modernem Leben. In unserem
                liebevoll restaurierten Anwesen finden Sie einen Ort der Ruhe, Inspiration und Begegnung.
              </p>
              <p>
                Ob Sie in unserem gemütlichen Café entspannen, im Co-Working Space produktiv arbeiten, die Geschichte im
                Gutsmuseum entdecken oder in unseren Gästezimmern übernachten möchten – bei uns finden Sie Zeit für das
                Wesentliche.
              </p>
              <p className="font-medium text-foreground">
                Ein Ort, an dem Tradition und Moderne harmonisch zusammenkommen.
              </p>
            </div>
          </div>
          <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-2xl">
            <img src="/historic-german-manor-interior-with-rustic-charm.jpg" alt="Rittergut Interior" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  )
}
