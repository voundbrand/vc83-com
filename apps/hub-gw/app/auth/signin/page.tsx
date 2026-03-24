"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useUser } from "@/lib/user-context"

function mapSignInError(error: string | null): string | null {
  if (!error) return null
  if (error === "CredentialsSignin") {
    return "E-Mail oder Passwort ist ungültig."
  }
  if (error === "OAuthSignin" || error === "OAuthCallback") {
    return "Die OIDC-Anmeldung konnte nicht abgeschlossen werden."
  }
  if (error === "AccessDenied") {
    return "Der Zugriff wurde vom Identity Provider verweigert."
  }
  return "Die Anmeldung ist fehlgeschlagen."
}

export default function HubGwSignInPage() {
  const searchParams = useSearchParams()
  const { authMode, isLoggedIn, login } = useUser()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const errorMessage = localError || mapSignInError(searchParams.get("error"))

  async function handlePlatformSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setLocalError(null)

    const result = await login({
      callbackUrl,
      email,
      password,
    })

    if (!result.ok) {
      setLocalError(result.error || "Die Anmeldung ist fehlgeschlagen.")
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Anmeldung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {authMode === "mock" ? (
              <p className="text-sm text-muted-foreground">
                Hub-GW läuft aktuell im Mock-Modus. Aktivieren Sie Plattform-
                oder OIDC-Login für produktive Anmeldungen.
              </p>
            ) : authMode === "platform" ? (
              <p className="text-sm text-muted-foreground">
                Melden Sie sich mit Ihrem Plattform-Konto an, um die
                Admin-Ansicht für diese Organisation zu öffnen.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Diese Organisation nutzt ein eigenes OIDC-Login.
              </p>
            )}

            {isLoggedIn ? (
              <Link href={callbackUrl}>
                <Button>Zum Dashboard</Button>
              </Link>
            ) : authMode === "platform" ? (
              <form className="space-y-3" onSubmit={handlePlatformSignIn}>
                <Input
                  autoComplete="email"
                  type="email"
                  placeholder="E-Mail"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Input
                  autoComplete="current-password"
                  type="password"
                  placeholder="Passwort"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? "Anmeldung läuft..." : "Mit Plattform-Konto anmelden"}
                </Button>
              </form>
            ) : (
              <Button
                onClick={() => {
                  void login({ callbackUrl })
                }}
                className="w-full sm:w-auto"
              >
                Mit OIDC anmelden
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
