import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { BookingProvider } from "@/lib/booking-context"
import "./globals.css"

// Updated fonts for elegant, traditional aesthetic
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" })
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "l4yercak3 Studio - Premium Co-Working Space",
  description:
    "Experience productivity in a beautifully restored traditional house on the marketplace. Premium co-working space with studio, executive suites, and modern amenities.",
  generator: "v0.app",
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
    <html lang="en">
      <body className={`${inter.className} ${playfair.variable} font-sans antialiased`}>
        <AuthProvider>
          <BookingProvider>{children}</BookingProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
