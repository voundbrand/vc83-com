import Link from "next/link"
import { MapPin, Phone, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-foreground text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-serif text-2xl mb-4">Landstübchen</h3>
            <p className="text-white/80 leading-relaxed">
              Ihre gemütliche Pension im Herzen von Viereck. Erleben Sie Ruhe und Entspannung in naturnaher Umgebung.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Kontakt</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-white/80">
                  <p>Pension Landstübchen</p>
                  <p>Dorfstraße 12</p>
                  <p>17309 Viereck</p>
                </div>
              </div>
              <a
                href="tel:+4939748550980"
                className="flex items-center gap-3 text-white/80 hover:text-white transition-colors"
              >
                <Phone className="w-5 h-5" />
                +49 39748 550980
              </a>
              <a
                href="mailto:info@landstuebchen.de"
                className="flex items-center gap-3 text-white/80 hover:text-white transition-colors"
              >
                <Mail className="w-5 h-5" />
                info@landstuebchen.de
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Navigation</h4>
            <div className="space-y-2">
              <Link href="/" className="block text-white/80 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/zimmer" className="block text-white/80 hover:text-white transition-colors">
                Zimmer
              </Link>
              <Link href="/kontakt" className="block text-white/80 hover:text-white transition-colors">
                Kontakt
              </Link>
              <Link href="/buchen" className="block text-white/80 hover:text-white transition-colors">
                Buchen
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-white/60 text-sm">
          <p>&copy; {new Date().getFullYear()} Pension Landstübchen. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  )
}
