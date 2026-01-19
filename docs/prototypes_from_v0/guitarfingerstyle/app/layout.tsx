import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./ClientLayout"
import "./globals.css"

export const metadata: Metadata = {
  title: "Guitarfingerstyle - Lutz M. Splettstoesser",
  description:
    "Guitar fingerstyle playing, guitar building craftsmanship, sheet music, tabs, and resources for acoustic guitar enthusiasts",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <ClientLayout>{children}</ClientLayout>
}
