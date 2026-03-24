import type { DefaultSession } from "next-auth"

type HubGwSessionAuthMode = "mock" | "platform" | "oidc"

interface HubGwSessionAuthContext {
  mode: HubGwSessionAuthMode
  provider: string | null
  frontendUserId: string | null
  crmContactId: string | null
  crmOrganizationId: string | null
  subOrgId: string | null
  isSeller: boolean
}

declare module "next-auth" {
  interface User {
    auth?: HubGwSessionAuthContext
  }

  interface Session {
    user: DefaultSession["user"]
    auth: HubGwSessionAuthContext
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    auth?: HubGwSessionAuthContext
    platformSessionId?: string | null
    platformSessionExpiresAt?: number | null
  }
}
