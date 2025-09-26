import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { WindowManagerProvider } from "@/hooks/use-window-manager"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "VC83 Podcast | VC Insights from Mecklenburg-Vorpommern",
  description: "Raw VC truths from zero to fund one—interviews and underdog plays for Eastern Germany's rising scene.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${inter.variable} antialiased`}>
        <Suspense>
          <WindowManagerProvider>{children}</WindowManagerProvider>
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
