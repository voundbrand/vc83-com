import type { DefaultSession } from "next-auth"

type SegelschuleSessionAuthMode = "mock" | "platform" | "oidc"

interface SegelschuleSessionAuthContext {
  mode: SegelschuleSessionAuthMode
  provider: string | null
  platformUserId: string | null
  scopeOrganizationId: string | null
}

declare module "next-auth" {
  interface User {
    auth?: SegelschuleSessionAuthContext
  }

  interface Session {
    user: DefaultSession["user"]
    auth: SegelschuleSessionAuthContext
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    auth?: SegelschuleSessionAuthContext
    platformSessionId?: string | null
    platformSessionExpiresAt?: number | null
  }
}
