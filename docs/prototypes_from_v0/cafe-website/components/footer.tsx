import { Facebook, Instagram, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-serif text-2xl font-bold mb-4">Rittergut Damerow</h3>
            <p className="text-background/80 leading-relaxed">
              Zeit für Café, Co Working Space, Gutsmuseum & Gästezimmer
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Schnelllinks</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-background/80 hover:text-background transition-colors">
                  Über Uns
                </a>
              </li>
              <li>
                <a href="#spaces" className="text-background/80 hover:text-background transition-colors">
                  Räume
                </a>
              </li>
              <li>
                <a href="#gallery" className="text-background/80 hover:text-background transition-colors">
                  Galerie
                </a>
              </li>
              <li>
                <a href="#contact" className="text-background/80 hover:text-background transition-colors">
                  Kontakt
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Folgen Sie uns</h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="p-2 bg-background/10 rounded-lg hover:bg-background/20 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 bg-background/10 rounded-lg hover:bg-background/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 bg-background/10 rounded-lg hover:bg-background/20 transition-colors"
                aria-label="E-Mail"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 text-center text-background/60 text-sm">
          <p>&copy; {new Date().getFullYear()} Rittergut Damerow. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  )
}
