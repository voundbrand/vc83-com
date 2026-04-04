import type React from "react"
import type { Metadata } from "next"
import { Geist_Mono, Montserrat } from "next/font/google"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/lib/language-context"
import { CmsSiteProvider } from "@/components/cms-site-provider"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

const romantica = localFont({
  src: "../resources/RomanticaSignature-Regular.otf",
  variable: "--font-romantica",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Segelschule Altwarp | Segeln lernen & Selbstvertrauen gewinnen | Segelkurs Berlin & Ostsee",
  description:
    "Nur 2,5 h von Berlin: Lerne Segeln in Altwarp – kleine Gruppen, Plattbodenschiffe, ruhiges Revier. Mach deinen Segelschein oder trainiere Praxis mit Erfahrung und Freude.",
  keywords: "Segelschule Altwarp, Segelkurs Berlin, Segeln lernen, Segelschein, Praxistraining Segeln, Plattbodenschiff, Segelurlaub Ostsee",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${montserrat.variable} ${geistMono.variable} ${romantica.variable}`}>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <CmsSiteProvider>{children}</CmsSiteProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
