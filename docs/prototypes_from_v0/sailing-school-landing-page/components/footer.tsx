import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react"
import { Logo } from "./logo"

interface FooterProps {
  content: {
    location: string
    address: string
    phone: string
    email: string
    social: string
    copyright: string
  }
}

export function Footer({ content }: FooterProps) {
  return (
    <footer className="bg-primary text-primary-foreground py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 flex justify-center">
          <Logo isScrolled={false} size="lg" />
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-serif font-bold mb-4">{content.location}</h3>
            <div className="space-y-3 font-sans">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>{content.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 flex-shrink-0" />
                <span>{content.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 flex-shrink-0" />
                <a href={`mailto:${content.email}`} className="hover:underline">
                  {content.email}
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-serif font-bold mb-4">Navigation</h3>
            <nav className="space-y-2 font-sans">
              <a href="#courses" className="block hover:underline">
                Kurse
              </a>
              <a href="#team" className="block hover:underline">
                Team
              </a>
              <a href="#gallery" className="block hover:underline">
                Galerie
              </a>
              <a href="#contact" className="block hover:underline">
                Kontakt
              </a>
            </nav>
          </div>

          <div>
            <h3 className="text-xl font-serif font-bold mb-4">{content.social}</h3>
            <div className="flex gap-4">
              <a href="#" className="hover:scale-110 transition-transform" aria-label="Facebook">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="hover:scale-110 transition-transform" aria-label="Instagram">
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm">
          <p className="font-sans">{content.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
