"use client"

import { SessionProvider } from "next-auth/react"
import { DataProvider, type InitialData } from "@/lib/data-context"
import { UserProvider } from "@/lib/user-context"
import type { HubGwResolvedAuthMode } from "@/lib/auth"

interface ProvidersProps {
  children: React.ReactNode
  initialData?: InitialData
  authMode: HubGwResolvedAuthMode
  authProviderId: string | null
}

export function Providers({
  children,
  initialData,
  authMode,
  authProviderId,
}: ProvidersProps) {
  return (
    <SessionProvider session={null}>
      <UserProvider authMode={authMode} authProviderId={authProviderId}>
        <DataProvider initialData={initialData}>{children}</DataProvider>
      </UserProvider>
    </SessionProvider>
  )
}
