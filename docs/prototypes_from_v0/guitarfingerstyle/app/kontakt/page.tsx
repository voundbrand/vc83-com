import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Guitar, ArrowLeft, Mail, User } from "lucide-react"
import Link from "next/link"

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Guitar className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Guitarfingerstyle</h1>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/gitarrenbau" className="text-muted-foreground hover:text-primary transition-colors">
                Gitarrenbau
              </Link>
              <Link href="/noten-und-tabs" className="text-muted-foreground hover:text-primary transition-colors">
                Noten/Tabs
              </Link>
              <Link href="/links" className="text-muted-foreground hover:text-primary transition-colors">
                Links
              </Link>
              <Link href="/kontakt" className="text-primary font-medium">
                Kontakt
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Startseite
          </Link>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Kontakt</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Ich existiere nicht nur virtuell... Und so erreichen Sie mich - für Feedback und Anregungen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Kontaktdaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Lutz M. Splettstoesser</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">E-Mail</p>
                  <a href="mailto:lsplett@freenet.de" className="text-primary hover:underline">
                    lsplett@freenet.de
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Erfahrungsaustausch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">
                Gerne bin ich auch zu einem konstruktiven Erfahrungsaustausch mit allen Interessierten bereit. Über
                Rückmeldungen freue ich mich immer.
              </p>
              <p className="leading-relaxed">
                Ob Sie Fragen zum Gitarrenbau haben, Anregungen zu den Noten und Tabs oder einfach nur Ihre Erfahrungen
                teilen möchten - ich freue mich auf Ihre Nachricht.
              </p>
              <div className="pt-4">
                <Button className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  E-Mail schreiben
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Über den Kontakt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground">
              Lutz Splettstoesser ist ein leidenschaftlicher Hobbygitarrist und Gitarrenbauer aus Pasewalk in
              Mecklenburg-Vorpommern. Seine Erfahrungen und sein Wissen rund um die akustische Gitarre teilt er gerne
              mit anderen Interessierten.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
