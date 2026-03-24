import type { Metadata } from "next"
import { headers } from "next/headers"
import { Providers } from "@/app/providers"
import { fetchAllData } from "@/lib/data-server"
import { resolveHubGwAuthClientConfig } from "@/lib/auth"
import { Footer } from "@/components/footer"
import "./globals.css"

export const metadata: Metadata = {
  title: "Gründungswerft Hub",
  description: "Benefits & Provisionen für Gründungswerft-Mitglieder",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const requestHeaders = await headers()
  const requestHost =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host")

  const initialData = await fetchAllData({ requestHost })
  const authConfig = await resolveHubGwAuthClientConfig(process.env, {
    requestHost,
  })

  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers
          initialData={initialData}
          authMode={authConfig.mode}
          authProviderId={authConfig.providerId}
        >
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
