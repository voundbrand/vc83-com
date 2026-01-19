import type React from "react"
import type { Metadata } from "next"
import { Roboto, Roboto_Slab } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
})

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "Pension Landstübchen - Urlaub in Viereck",
  description: "Romantik auf dem Land - Ihre gemütliche Pension in Viereck",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={roboto.className}>
        <Navigation />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
