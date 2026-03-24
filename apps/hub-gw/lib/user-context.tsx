"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { Session } from "next-auth"
import { signIn, signOut, useSession } from "next-auth/react"
import type { HubGwResolvedAuthMode } from "@/lib/auth"
import type { UserProfile } from "./types"
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
  user: UserProfile | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (options?: LoginOptions) => Promise<LoginResult>
  logout: () => void
}

const UserContext = createContext<UserContextType | null>(null)

const EMPTY_BUSINESS_PROFILE: UserProfile["business"] = {
  legalName: "",
  registerNumber: "",
  taxId: "",
  address: {
    street: "",
    city: "",
    postalCode: "",
    country: "",
  },
  foundedDate: "",
  industry: "",
}

function mapSessionToUser(session: Session | null): UserProfile | null {
  const sessionUser = session?.user
  const email = sessionUser?.email?.trim()
  if (!email) return null

  return {
    name: sessionUser?.name?.trim() || email,
    email,
    phone: "",
    avatar: sessionUser?.image || undefined,
    business: EMPTY_BUSINESS_PROFILE,
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
  const isLoading = usesSessionAuth ? status === "loading" : false

  const sessionUser = useMemo(() => mapSessionToUser(session), [session])

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

  const isLoggedIn = usesSessionAuth ? Boolean(sessionUser) : mockLoggedIn
  const user = usesSessionAuth ? sessionUser : (isLoggedIn ? currentUser : null)

  return (
    <UserContext.Provider
      value={{
        authMode,
        authProviderId,
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
