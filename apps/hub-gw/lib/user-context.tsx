"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session } from "next-auth"
import { signIn, signOut, useSession } from "next-auth/react"
import type { HubGwResolvedAuthMode } from "@/lib/auth"
import type { UserBusinessProfile, UserProfile } from "./types"
import { mockUser } from "./mock-data"

interface LoginOptions {
  callbackUrl?: string
  email?: string
  password?: string
}

interface LoginResult {
  ok: boolean
  error?: string
}

interface UserContextType {
  authMode: HubGwResolvedAuthMode
  authProviderId: string | null
  authContext: Session["auth"] | null
  user: UserProfile | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (options?: LoginOptions) => Promise<LoginResult>
  logout: () => void
}

const UserContext = createContext<UserContextType | null>(null)

interface EnrichmentPayload {
  phone: string | null
  business: UserBusinessProfile | null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeBusinessProfile(value: unknown): UserBusinessProfile | null {
  const source = asRecord(value)
  if (!Object.keys(source).length) return null

  const addressRecord = asRecord(source.address)
  const business: UserBusinessProfile = {
    legalName: normalizeOptionalString(source.legalName) || "",
    registerNumber: normalizeOptionalString(source.registerNumber) || "",
    taxId: normalizeOptionalString(source.taxId) || "",
    address: {
      street: normalizeOptionalString(addressRecord.street) || "",
      city: normalizeOptionalString(addressRecord.city) || "",
      postalCode: normalizeOptionalString(addressRecord.postalCode) || "",
      country: normalizeOptionalString(addressRecord.country) || "",
    },
    foundedDate: normalizeOptionalString(source.foundedDate) || "",
    industry: normalizeOptionalString(source.industry) || "",
  }

  const hasAnyField = Boolean(
    business.legalName ||
      business.registerNumber ||
      business.taxId ||
      business.address.street ||
      business.address.city ||
      business.address.postalCode ||
      business.address.country ||
      business.foundedDate ||
      business.industry
  )
  return hasAnyField ? business : null
}

function normalizeEnrichmentPayload(payload: unknown): EnrichmentPayload {
  const source = asRecord(payload)
  return {
    phone: normalizeOptionalString(source.phone),
    business: normalizeBusinessProfile(source.business),
  }
}

function mapSessionToUser(
  session: Session | null,
  enrichment: EnrichmentPayload
): UserProfile | null {
  const sessionUser = session?.user
  const email = sessionUser?.email?.trim()
  if (!email) return null

  return {
    name: sessionUser?.name?.trim() || email,
    email,
    phone: enrichment.phone || undefined,
    avatar: sessionUser?.image || undefined,
    business: enrichment.business,
  }
}

function mapCredentialsSignInError(error: string | null | undefined): string {
  if (!error || error === "CredentialsSignin") {
    return "E-Mail oder Passwort ist ungültig."
  }
  return "Die Anmeldung ist fehlgeschlagen."
}

function buildAuthProviderId(mode: HubGwResolvedAuthMode, providerId: string | null): string {
  if (providerId) {
    return providerId
  }
  if (mode === "platform") {
    return "platform"
  }
  return "frontend_oidc"
}

export function UserProvider({
  children,
  authMode,
  authProviderId,
}: {
  children: ReactNode
  authMode: HubGwResolvedAuthMode
  authProviderId: string | null
}) {
  const { data: session, status } = useSession()
  const usesSessionAuth = authMode === "oidc" || authMode === "platform"
  const authContext = usesSessionAuth && session ? session.auth : null

  const [enrichment, setEnrichment] = useState<EnrichmentPayload>({
    phone: null,
    business: null,
  })
  const [isEnrichmentLoading, setIsEnrichmentLoading] = useState(false)

  useEffect(() => {
    if (!usesSessionAuth || !session) {
      setEnrichment({ phone: null, business: null })
      setIsEnrichmentLoading(false)
      return
    }

    const hasIdentityContext = Boolean(
      authContext?.crmContactId || authContext?.crmOrganizationId
    )
    if (!hasIdentityContext) {
      setEnrichment({ phone: null, business: null })
      setIsEnrichmentLoading(false)
      return
    }

    const controller = new AbortController()
    let mounted = true

    const loadEnrichment = async () => {
      setIsEnrichmentLoading(true)
      try {
        const response = await fetch("/api/auth/enrichment", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        if (!mounted) return

        if (!response.ok) {
          setEnrichment({ phone: null, business: null })
          return
        }

        const payload = await response.json()
        if (!mounted) return

        setEnrichment(normalizeEnrichmentPayload(payload))
      } catch (error) {
        if (
          mounted &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          console.error("[hub-gw-profile] Failed to load enrichment", error)
          setEnrichment({ phone: null, business: null })
        }
      } finally {
        if (mounted) {
          setIsEnrichmentLoading(false)
        }
      }
    }

    void loadEnrichment()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [
    authContext?.crmContactId,
    authContext?.crmOrganizationId,
    session,
    usesSessionAuth,
  ])

  const sessionUser = useMemo(
    () => mapSessionToUser(session, enrichment),
    [enrichment, session]
  )

  const [mockLoggedIn, setMockLoggedIn] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserProfile>(mockUser)

  const login = async (options: LoginOptions = {}): Promise<LoginResult> => {
    const callbackUrl = options.callbackUrl || "/"

    if (authMode === "mock") {
      if (options.email || options.password) {
        setCurrentUser((current) => ({
          ...current,
          email: options.email?.trim() || current.email,
          name: current.name || options.email?.trim() || current.name,
        }))
      }
      setMockLoggedIn(true)
      return { ok: true }
    }

    const providerId = buildAuthProviderId(authMode, authProviderId)

    if (authMode === "platform") {
      const email = options.email?.trim().toLowerCase()
      const password = typeof options.password === "string" ? options.password : ""

      if (!email || !password) {
        if (typeof window !== "undefined") {
          const signInUrl = new URL("/auth/signin", window.location.origin)
          signInUrl.searchParams.set("callbackUrl", callbackUrl)
          window.location.assign(signInUrl.toString())
        }
        return { ok: true }
      }

      const result = await signIn(providerId, {
        redirect: false,
        email,
        password,
        callbackUrl,
      })

      if (!result || result.ok === false || result.error) {
        return {
          ok: false,
          error: mapCredentialsSignInError(result?.error),
        }
      }

      if (result.url && typeof window !== "undefined") {
        window.location.assign(result.url)
      }

      return { ok: true }
    }

    await signIn(providerId, { callbackUrl })
    return { ok: true }
  }

  const logout = () => {
    if (usesSessionAuth) {
      void signOut({ callbackUrl: "/auth/signin" })
      return
    }
    setMockLoggedIn(false)
  }

  const isLoggedIn = usesSessionAuth
    ? Boolean(session?.user?.email && sessionUser)
    : mockLoggedIn
  const isLoading = usesSessionAuth
    ? status === "loading" || isEnrichmentLoading
    : false
  const user = usesSessionAuth ? sessionUser : (isLoggedIn ? currentUser : null)

  return (
    <UserContext.Provider
      value={{
        authMode,
        authProviderId,
        authContext,
        user,
        isLoggedIn,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within UserProvider")
  }
  return context
}
