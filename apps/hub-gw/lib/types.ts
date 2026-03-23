export type ProviderType = "person" | "startup"

export interface Provider {
  name: string
  type: ProviderType
  profileLink?: string
  avatar?: string
}

export interface Benefit {
  id: string
  title: string
  description: string
  fullDescription?: string
  redemptionInstructions?: string
  redemptionCode?: string
  redemptionLink?: string
  category: string
  provider: Provider
  discount?: string
  image?: string
  ownerId: string
  views?: number
  clicks?: number
}

export interface Provision {
  id: string
  title: string
  description: string
  fullDescription?: string
  category: string
  commission: string
  provider: Provider
  image?: string
  ownerId: string
  views?: number
  clicks?: number
}

export interface Leistung {
  id: string
  title: string
  description: string
  fullDescription?: string
  category: string
  skills: string[]
  hourlyRate?: string
  location: string
  provider: Provider
  rating: number
  image?: string
  ownerId: string
  views?: number
  clicks?: number
}

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

export interface BenefitRequest {
  id: string
  benefitId: string
  benefitTitle: string
  status: "pending" | "approved" | "rejected"
  message: string
  createdAt: string
  respondedAt?: string
}
