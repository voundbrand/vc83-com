"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Benefit, Provision, Leistung } from "./types"
import {
  CURRENT_USER_ID,
  initialBenefits,
  initialProvisionen,
  initialLeistungen,
} from "./mock-data"

export interface InitialData {
  benefits?: Benefit[]
  provisionen?: Provision[]
  leistungen?: Leistung[]
}

interface DataContextType {
  benefits: Benefit[]
  addBenefit: (benefit: Omit<Benefit, "id" | "ownerId">) => void
  updateBenefit: (id: string, updates: Partial<Benefit>) => void
  deleteBenefit: (id: string) => void

  provisionen: Provision[]
  addProvision: (provision: Omit<Provision, "id" | "ownerId">) => void
  updateProvision: (id: string, updates: Partial<Provision>) => void
  deleteProvision: (id: string) => void

  leistungen: Leistung[]
  addLeistung: (leistung: Omit<Leistung, "id" | "ownerId">) => void
  updateLeistung: (id: string, updates: Partial<Leistung>) => void
  deleteLeistung: (id: string) => void

  getMyBenefits: () => Benefit[]
  getMyProvisionen: () => Provision[]
  getMyLeistungen: () => Leistung[]
}

const DataContext = createContext<DataContextType | null>(null)

interface DataProviderProps {
  children: ReactNode
  initialData?: InitialData
}

export function DataProvider({ children, initialData }: DataProviderProps) {
  const [benefits, setBenefits] = useState<Benefit[]>(
    initialData?.benefits ?? initialBenefits
  )
  const [provisionen, setProvisionen] = useState<Provision[]>(
    initialData?.provisionen ?? initialProvisionen
  )
  const [leistungen, setLeistungen] = useState<Leistung[]>(
    initialData?.leistungen ?? initialLeistungen
  )

  const addBenefit = (benefit: Omit<Benefit, "id" | "ownerId">) => {
    setBenefits((prev) => [
      ...prev,
      { ...benefit, id: `benefit-${Date.now()}`, ownerId: CURRENT_USER_ID },
    ])
  }

  const updateBenefit = (id: string, updates: Partial<Benefit>) => {
    setBenefits((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }

  const deleteBenefit = (id: string) => {
    setBenefits((prev) => prev.filter((b) => b.id !== id))
  }

  const addProvision = (provision: Omit<Provision, "id" | "ownerId">) => {
    setProvisionen((prev) => [
      ...prev,
      { ...provision, id: `provision-${Date.now()}`, ownerId: CURRENT_USER_ID },
    ])
  }

  const updateProvision = (id: string, updates: Partial<Provision>) => {
    setProvisionen((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deleteProvision = (id: string) => {
    setProvisionen((prev) => prev.filter((p) => p.id !== id))
  }

  const addLeistung = (leistung: Omit<Leistung, "id" | "ownerId">) => {
    setLeistungen((prev) => [
      ...prev,
      { ...leistung, id: `leistung-${Date.now()}`, ownerId: CURRENT_USER_ID },
    ])
  }

  const updateLeistung = (id: string, updates: Partial<Leistung>) => {
    setLeistungen((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }

  const deleteLeistung = (id: string) => {
    setLeistungen((prev) => prev.filter((l) => l.id !== id))
  }

  const getMyBenefits = () => benefits.filter((b) => b.ownerId === CURRENT_USER_ID)
  const getMyProvisionen = () => provisionen.filter((p) => p.ownerId === CURRENT_USER_ID)
  const getMyLeistungen = () => leistungen.filter((l) => l.ownerId === CURRENT_USER_ID)

  return (
    <DataContext.Provider
      value={{
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
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within DataProvider")
  }
  return context
}
