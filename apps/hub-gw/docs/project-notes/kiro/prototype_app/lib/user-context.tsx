"use client"

import { createContext, useContext, ReactNode, useState } from 'react'

// Mock user data - in a real app, this would come from authentication
export interface UserProfile {
  name: string
  email: string
  phone: string
  avatar?: string
  business: {
    legalName: string
    registerNumber: string
    taxId: string
    address: {
      street: string
      city: string
      postalCode: string
      country: string
    }
    foundedDate: string
    industry: string
  }
}

interface UserContextType {
  user: UserProfile | null
  isLoggedIn: boolean
  login: (userData?: UserProfile) => void
  logout: () => void
}

const mockUser: UserProfile = {
  name: "Julia Schneider",
  email: "julia.schneider@muster-tech.de",
  phone: "+49 151 12345678",
  avatar: "/diverse-user-avatars.png",
  business: {
    legalName: "Muster Tech Solutions GmbH",
    registerNumber: "HRB 123456",
    taxId: "DE123456789",
    address: {
      street: "Hauptstraße 42",
      city: "Berlin",
      postalCode: "10115",
      country: "Deutschland",
    },
    foundedDate: "2022-03-15",
    industry: "IT & Software",
  },
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(true) // Start logged in for demo
  const [currentUser, setCurrentUser] = useState<UserProfile>(mockUser)

  const login = (userData?: UserProfile) => {
    if (userData) {
      setCurrentUser(userData)
    }
    setIsLoggedIn(true)
  }
  
  const logout = () => setIsLoggedIn(false)

  return (
    <UserContext.Provider value={{ 
      user: isLoggedIn ? currentUser : null, 
      isLoggedIn, 
      login, 
      logout 
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
