"use client"

import type React from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

function SearchParamsHandler({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  return <>{children}</>
}

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className={`font-sans ${inter.variable} ${jetbrainsMono.variable}`}>
        <Suspense fallback={null}>
          <SearchParamsHandler>{children}</SearchParamsHandler>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
