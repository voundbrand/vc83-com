import type { Metadata } from "next"
import { UserProvider } from "@/lib/user-context"
import { DataProvider } from "@/lib/data-context"
import { fetchAllData } from "@/lib/data-server"
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
  const initialData = await fetchAllData()

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
        <UserProvider>
          <DataProvider initialData={initialData}>
            {children}
            <Footer />
          </DataProvider>
        </UserProvider>
      </body>
    </html>
  )
}
