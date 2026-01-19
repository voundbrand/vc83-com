import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold">Seite nicht gefunden</h2>
        <p className="text-muted-foreground max-w-md">
          Die von Ihnen gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        <Button asChild size="lg">
          <Link href="/">Zurück zur Startseite</Link>
        </Button>
      </div>
    </div>
  )
}
