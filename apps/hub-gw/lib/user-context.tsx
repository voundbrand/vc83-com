"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { UserProfile } from "./types"
import { mockUser } from "./mock-data"

interface UserContextType {
  user: UserProfile | null
  isLoggedIn: boolean
  login: (userData?: UserProfile) => void
  logout: () => void
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserProfile>(mockUser)

  const login = (userData?: UserProfile) => {
    if (userData) setCurrentUser(userData)
    setIsLoggedIn(true)
  }

  const logout = () => setIsLoggedIn(false)

  return (
    <UserContext.Provider
      value={{
        user: isLoggedIn ? currentUser : null,
        isLoggedIn,
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
