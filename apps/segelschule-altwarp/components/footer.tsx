"use client"

import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react"
import { EditableHeading, EditableText } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import { Logo } from "./logo"

interface FooterProps {
  content: {
    location: string
    address: string
    phone: string
    email: string
    social: string
    copyright: string
    navigation: string
    navCourses: string
    navTeam: string
    navGallery: string
    navContact: string
  }
}

export function Footer({ content }: FooterProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <footer className="bg-primary text-primary-foreground py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 flex justify-center">
          <Logo isScrolled={false} size="lg" />
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            {cmsEnabled ? (
              <EditableHeading
                page="home"
                section="footer"
                contentKey="location"
                fallback={content.location}
                level={3}
                className="text-2xl font-serif font-bold mb-4"
              />
            ) : (
              <h3 className="text-2xl font-serif font-bold mb-4">{content.location}</h3>
            )}
            <div className="space-y-3 font-sans">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="footer"
                    contentKey="address"
                    fallback={content.address}
                  />
                ) : (
                  <span>{content.address}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 flex-shrink-0" />
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="footer"
                    contentKey="phone"
                    fallback={content.phone}
                  />
                ) : (
                  <span>{content.phone}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 flex-shrink-0" />
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="footer"
                    contentKey="email"
                    fallback={content.email}
                  />
                ) : (
                  <a href={`mailto:${content.email}`} className="hover:underline">
                    {content.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div>
            {cmsEnabled ? (
              <EditableHeading
                page="home"
                section="footer"
                contentKey="navigation"
                fallback={content.navigation}
                level={3}
                className="text-xl font-serif font-bold mb-4"
              />
            ) : (
              <h3 className="text-xl font-serif font-bold mb-4">{content.navigation}</h3>
            )}
            <nav className="space-y-2 font-sans">
              <a href="#courses" className="block hover:underline">
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="footer"
                    contentKey="navCourses"
                    fallback={content.navCourses}
                  />
                ) : (
                  content.navCourses
                )}
              </a>
              <a href="#team" className="block hover:underline">
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="footer"
                    contentKey="navTeam"
                    fallback={content.navTeam}
                  />
                ) : (
                  content.navTeam
                )}
              </a>
              <a href="#gallery" className="block hover:underline">
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="footer"
                    contentKey="navGallery"
                    fallback={content.navGallery}
                  />
                ) : (
                  content.navGallery
                )}
              </a>
              <a href="#contact" className="block hover:underline">
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="footer"
                    contentKey="navContact"
                    fallback={content.navContact}
                  />
                ) : (
                  content.navContact
                )}
              </a>
            </nav>
          </div>

          <div>
            {cmsEnabled ? (
              <EditableHeading
                page="home"
                section="footer"
                contentKey="social"
                fallback={content.social}
                level={3}
                className="text-xl font-serif font-bold mb-4"
              />
            ) : (
              <h3 className="text-xl font-serif font-bold mb-4">{content.social}</h3>
            )}
            <div className="flex gap-4">
              <a href="https://www.facebook.com/segelschulealtwarp" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform" aria-label="Facebook">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="https://www.instagram.com/segelschulealtwarp/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform" aria-label="Instagram">
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm">
          {cmsEnabled ? (
            <EditableText
              page="home"
              section="footer"
              contentKey="copyright"
              fallback={content.copyright}
              className="font-sans"
            />
          ) : (
            <p className="font-sans">{content.copyright}</p>
          )}
        </div>
      </div>
    </footer>
  )
}
