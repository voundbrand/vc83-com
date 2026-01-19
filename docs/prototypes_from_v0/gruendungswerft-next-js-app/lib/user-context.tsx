"use client"

import { createContext, useContext, ReactNode } from 'react'

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

const UserContext = createContext<UserProfile | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  return (
    <UserContext.Provider value={mockUser}>
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
