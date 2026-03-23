"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

export type ProviderType = 'person' | 'startup'

export interface Provider {
  name: string
  type: ProviderType
  profileLink?: string // Link to Gründungswerft profile (will be synced via OAuth later)
  avatar?: string
}

export interface Benefit {
  id: string
  title: string
  description: string
  fullDescription?: string
  redemptionInstructions?: string // How to redeem: code, link, contact, etc.
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

interface DataContextType {
  // Benefits
  benefits: Benefit[]
  addBenefit: (benefit: Omit<Benefit, 'id' | 'ownerId'>) => void
  updateBenefit: (id: string, benefit: Partial<Benefit>) => void
  deleteBenefit: (id: string) => void
  
  // Provisionen
  provisionen: Provision[]
  addProvision: (provision: Omit<Provision, 'id' | 'ownerId'>) => void
  updateProvision: (id: string, provision: Partial<Provision>) => void
  deleteProvision: (id: string) => void
  
  // Leistungen
  leistungen: Leistung[]
  addLeistung: (leistung: Omit<Leistung, 'id' | 'ownerId'>) => void
  updateLeistung: (id: string, leistung: Partial<Leistung>) => void
  deleteLeistung: (id: string) => void
  
  // Get user's own items
  getMyBenefits: () => Benefit[]
  getMyProvisionen: () => Provision[]
  getMyLeistungen: () => Leistung[]
}

const CURRENT_USER_ID = "user-1" // Mock user ID

const initialBenefits: Benefit[] = [
  {
    id: "1",
    title: "50% Rabatt auf Marketing-Tools",
    description: "Exklusiver Rabatt auf alle Marketing-Automatisierungstools für Gründungswerft-Mitglieder.",
    fullDescription: "Unser Marketing-Automation-Tool bietet dir alles, was du für erfolgreiches Online-Marketing brauchst. Von E-Mail-Kampagnen über Social-Media-Planung bis hin zu detaillierten Analytics – alles in einer Plattform. Als Gründungswerft-Mitglied erhältst du 50% Rabatt auf alle Tarife für die ersten 12 Monate.",
    redemptionInstructions: "Um den Rabatt zu nutzen, registriere dich auf unserer Website und gib bei der Zahlung den Rabattcode ein. Der Rabatt wird automatisch angewendet.",
    redemptionCode: "GRUENDUNGSWERFT50",
    category: "Marketing",
    provider: {
      name: "MarketingPro GmbH",
      type: "startup",
      profileLink: "https://gruendungswerft.com/members/marketingpro",
      avatar: "/diverse-designers-brainstorming.png"
    },
    discount: "50%",
    image: "/diverse-designers-brainstorming.png",
    ownerId: "user-2",
    views: 245,
    clicks: 89
  },
  {
    id: "2",
    title: "Kostenlose Rechtsberatung",
    description: "Erste Rechtsberatung kostenlos für alle Mitglieder. Spezialisiert auf Startup-Recht.",
    fullDescription: "Als spezialisierte Kanzlei für Startup-Recht bieten wir umfassende Beratung in allen Rechtsfragen der Gründungsphase. Von der Wahl der Rechtsform über Gesellschaftsverträge bis hin zu Investorenverträgen – wir begleiten dich kompetent durch alle rechtlichen Herausforderungen.",
    redemptionInstructions: "Kontaktiere uns direkt per E-Mail oder Telefon und erwähne deine Gründungswerft-Mitgliedschaft. Wir vereinbaren dann einen kostenlosen Erstberatungstermin.",
    category: "Beratung",
    provider: {
      name: "Michael Weber",
      type: "person",
      profileLink: "https://gruendungswerft.com/members/michael-weber",
      avatar: "/man.jpg"
    },
    discount: "100%",
    image: "/professional-woman.png",
    ownerId: "user-1",
    views: 312,
    clicks: 156
  },
  {
    id: "3",
    title: "Cloud-Hosting Vergünstigung",
    description: "30% Rabatt auf Cloud-Hosting-Dienste für das erste Jahr.",
    fullDescription: "Unser Cloud-Hosting bietet dir die perfekte Infrastruktur für deine Web-Projekte. Mit Servern in Deutschland, automatischen Backups und 24/7 Support kannst du dich voll auf dein Produkt konzentrieren.",
    redemptionInstructions: "Klicke auf den Einlösen-Link unten und registriere dich mit deiner Gründungswerft-E-Mail-Adresse. Der Rabatt wird automatisch aktiviert.",
    redemptionLink: "https://cloudtech.example.com/gruendungswerft",
    category: "Software",
    provider: {
      name: "CloudTech Solutions",
      type: "startup",
      profileLink: "https://gruendungswerft.com/members/cloudtech",
      avatar: "/accountant-desk.png"
    },
    discount: "30%",
    image: "/accountant-desk.png",
    ownerId: "user-3",
    views: 178,
    clicks: 67
  },
]

const initialProvisionen: Provision[] = [
  {
    id: "1",
    title: "IT-Fachkräfte Vermittlung",
    description: "Vermittlung von qualifizierten IT-Fachkräften und Entwicklern für Startups und etablierte Unternehmen.",
    fullDescription: "Wir suchen ständig qualifizierte IT-Fachkräfte für unsere Kunden. Wenn du jemanden kennst, der auf der Suche nach einer neuen Herausforderung ist, vermittle ihn an uns und erhalte eine attraktive Provision.",
    category: "IT & Entwicklung",
    commission: "10%",
    provider: {
      name: "TechTalent GmbH",
      type: "startup",
      profileLink: "https://gruendungswerft.com/members/techtalent",
      avatar: "/diverse-designers-brainstorming.png"
    },
    image: "/diverse-designers-brainstorming.png",
    ownerId: "user-2",
    views: 189,
    clicks: 45
  },
  {
    id: "2",
    title: "Büroflächen Vermittlung",
    description: "Vermittlung von Büro- und Coworking-Spaces in ganz Deutschland.",
    fullDescription: "Als führender Vermittler von Büroflächen bieten wir attraktive Provisionen für erfolgreiche Vermittlungen. Egal ob kleines Startup oder etabliertes Unternehmen – wir finden die passende Lösung.",
    category: "Immobilien",
    commission: "5%",
    provider: {
      name: "Anna Schmidt",
      type: "person",
      profileLink: "https://gruendungswerft.com/members/anna-schmidt",
      avatar: "/diverse-woman-portrait.png"
    },
    image: "/accountant-desk.png",
    ownerId: "user-1",
    views: 134,
    clicks: 28
  },
]

const initialLeistungen: Leistung[] = [
  {
    id: "1",
    title: "Webentwicklung & Design",
    description: "Professionelle Webentwicklung mit React, Next.js und modernen Technologien.",
    fullDescription: "Ich biete professionelle Webentwicklung von der Konzeption bis zur Umsetzung. Spezialisiert auf moderne Frameworks wie React und Next.js, erstelle ich skalierbare und performante Webanwendungen.",
    category: "Webentwicklung",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    hourlyRate: "95€",
    location: "Berlin",
    provider: {
      name: "Julia Schneider",
      type: "person",
      profileLink: "https://gruendungswerft.com/members/julia-schneider",
      avatar: "/diverse-woman-portrait.png"
    },
    rating: 4.9,
    image: "/diverse-woman-portrait.png",
    ownerId: "user-1",
    views: 423,
    clicks: 178
  },
  {
    id: "2",
    title: "Grafikdesign & Branding",
    description: "Kreatives Grafikdesign für Startups und etablierte Unternehmen.",
    fullDescription: "Von der Logo-Entwicklung über Corporate Identity bis hin zu Marketing-Materialien – ich entwickle visuelle Identitäten, die im Gedächtnis bleiben und deine Marke stärken.",
    category: "Design",
    skills: ["Adobe Suite", "Figma", "Branding", "UI/UX"],
    hourlyRate: "75€",
    location: "München",
    provider: {
      name: "DesignStudio Berlin",
      type: "startup",
      profileLink: "https://gruendungswerft.com/members/designstudio-berlin",
      avatar: "/man.jpg"
    },
    rating: 4.7,
    image: "/man.jpg",
    ownerId: "user-2",
    views: 287,
    clicks: 92
  },
]

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [benefits, setBenefits] = useState<Benefit[]>(initialBenefits)
  const [provisionen, setProvisionen] = useState<Provision[]>(initialProvisionen)
  const [leistungen, setLeistungen] = useState<Leistung[]>(initialLeistungen)

  // Benefits CRUD
  const addBenefit = (benefit: Omit<Benefit, 'id' | 'ownerId'>) => {
    const newBenefit: Benefit = {
      ...benefit,
      id: `benefit-${Date.now()}`,
      ownerId: CURRENT_USER_ID,
    }
    setBenefits(prev => [...prev, newBenefit])
  }

  const updateBenefit = (id: string, updates: Partial<Benefit>) => {
    setBenefits(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const deleteBenefit = (id: string) => {
    setBenefits(prev => prev.filter(b => b.id !== id))
  }

  // Provisionen CRUD
  const addProvision = (provision: Omit<Provision, 'id' | 'ownerId'>) => {
    const newProvision: Provision = {
      ...provision,
      id: `provision-${Date.now()}`,
      ownerId: CURRENT_USER_ID,
    }
    setProvisionen(prev => [...prev, newProvision])
  }

  const updateProvision = (id: string, updates: Partial<Provision>) => {
    setProvisionen(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const deleteProvision = (id: string) => {
    setProvisionen(prev => prev.filter(p => p.id !== id))
  }

  // Leistungen CRUD
  const addLeistung = (leistung: Omit<Leistung, 'id' | 'ownerId'>) => {
    const newLeistung: Leistung = {
      ...leistung,
      id: `leistung-${Date.now()}`,
      ownerId: CURRENT_USER_ID,
    }
    setLeistungen(prev => [...prev, newLeistung])
  }

  const updateLeistung = (id: string, updates: Partial<Leistung>) => {
    setLeistungen(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  const deleteLeistung = (id: string) => {
    setLeistungen(prev => prev.filter(l => l.id !== id))
  }

  // Get user's own items
  const getMyBenefits = () => benefits.filter(b => b.ownerId === CURRENT_USER_ID)
  const getMyProvisionen = () => provisionen.filter(p => p.ownerId === CURRENT_USER_ID)
  const getMyLeistungen = () => leistungen.filter(l => l.ownerId === CURRENT_USER_ID)

  return (
    <DataContext.Provider value={{
      benefits,
      addBenefit,
      updateBenefit,
      deleteBenefit,
      provisionen,
      addProvision,
      updateProvision,
      deleteProvision,
      leistungen,
      addLeistung,
      updateLeistung,
      deleteLeistung,
      getMyBenefits,
      getMyProvisionen,
      getMyLeistungen,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}
