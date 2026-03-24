import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
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

const romantica = localFont({
  src: "../resources/RomanticaSignature-Regular.otf",
  variable: "--font-romantica",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Segelschule Altwarp - Segeln lernen in Ruhe am Stettiner Haff",
  description:
    "Segeln lernen – in Ruhe, Schritt für Schritt. Nur 2,5 Stunden von Berlin. Erlebe das weite Stettiner Haff auf traditionellen Plattbodenschiffen mit erfahrenen Trainern.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${montserrat.variable} ${romantica.variable}`}>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <CmsSiteProvider>{children}</CmsSiteProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
