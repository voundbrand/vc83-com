"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import type { HubGwResolvedAuthMode } from "@/lib/auth"
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
  addBenefit: (benefit: Omit<Benefit, "id" | "ownerId">) => Promise<boolean>
  updateBenefit: (id: string, updates: Partial<Benefit>) => void
  deleteBenefit: (id: string) => Promise<boolean>

  provisionen: Provision[]
  addProvision: (provision: Omit<Provision, "id" | "ownerId">) => Promise<boolean>
  updateProvision: (id: string, updates: Partial<Provision>) => void
  deleteProvision: (id: string) => Promise<boolean>

  leistungen: Leistung[]
  addLeistung: (leistung: Omit<Leistung, "id" | "ownerId">) => Promise<boolean>
  updateLeistung: (id: string, updates: Partial<Leistung>) => void
  deleteLeistung: (id: string) => Promise<boolean>

  getMyBenefits: () => Benefit[]
  getMyProvisionen: () => Provision[]
  getMyLeistungen: () => Leistung[]
}

const DataContext = createContext<DataContextType | null>(null)

interface DataProviderProps {
  children: ReactNode
  initialData?: InitialData
  authMode: HubGwResolvedAuthMode
}

function resolveSessionOwnerId(session: unknown): string | null {
  if (!session || typeof session !== "object") {
    return null
  }
  const maybeAuth = (session as { auth?: { frontendUserId?: unknown } }).auth
  if (!maybeAuth || typeof maybeAuth !== "object") {
    return null
  }
  const rawOwnerId = maybeAuth.frontendUserId
  if (typeof rawOwnerId !== "string") {
    return null
  }
  const normalizedOwnerId = rawOwnerId.trim()
  return normalizedOwnerId.length > 0 ? normalizedOwnerId : null
}

export function DataProvider({ children, initialData, authMode }: DataProviderProps) {
  const { data: session } = useSession()
  const sessionOwnerId = resolveSessionOwnerId(session)
  const currentOwnerId = authMode === "mock" ? CURRENT_USER_ID : sessionOwnerId

  const [benefits, setBenefits] = useState<Benefit[]>(
    initialData?.benefits ?? initialBenefits
  )
  const [provisionen, setProvisionen] = useState<Provision[]>(
    initialData?.provisionen ?? initialProvisionen
  )
  const [leistungen, setLeistungen] = useState<Leistung[]>(
    initialData?.leistungen ?? initialLeistungen
  )

  async function readErrorPayload(response: Response): Promise<string | null> {
    try {
      const payload = await response.json()
      if (
        payload &&
        typeof payload === "object" &&
        typeof (payload as { error?: unknown }).error === "string"
      ) {
        const errorMessage = (payload as { error: string }).error.trim()
        return errorMessage.length > 0 ? errorMessage : null
      }
    } catch {
      // Ignore parse failures and fallback to generic error message.
    }
    return null
  }

  async function createRemoteObject(
    path: string,
    body: Record<string, unknown>
  ): Promise<string | null> {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const details = await readErrorPayload(response)
      console.error("[hub-gw-data] Create request failed", {
        path,
        status: response.status,
        details,
      })
      return null
    }

    const payload = (await response.json().catch(() => null)) as { id?: unknown } | null
    if (!payload || typeof payload.id !== "string" || payload.id.trim().length === 0) {
      console.error("[hub-gw-data] Create request returned invalid object id", { path })
      return null
    }
    return payload.id
  }

  async function deleteRemoteObject(path: string, objectId: string): Promise<boolean> {
    const response = await fetch(`${path}?id=${encodeURIComponent(objectId)}`, {
      method: "DELETE",
      cache: "no-store",
    })

    if (!response.ok) {
      const details = await readErrorPayload(response)
      console.error("[hub-gw-data] Delete request failed", {
        path,
        objectId,
        status: response.status,
        details,
      })
      return false
    }

    return true
  }

  const addBenefit = async (benefit: Omit<Benefit, "id" | "ownerId">) => {
    if (!currentOwnerId) {
      console.warn("[hub-gw-data] Refusing to create benefit without owner context")
      return false
    }

    let id = `benefit-${Date.now()}`
    if (authMode !== "mock") {
      const remoteId = await createRemoteObject("/api/benefits", {
        title: benefit.title,
        category: benefit.category,
        discount: benefit.discount,
        fullDescription: benefit.fullDescription || benefit.description,
      })
      if (!remoteId) {
        return false
      }
      id = remoteId
    }
    setBenefits((prev) => [
      ...prev,
      { ...benefit, id, ownerId: currentOwnerId },
    ])
    return true
  }

  const updateBenefit = (id: string, updates: Partial<Benefit>) => {
    setBenefits((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }

  const deleteBenefit = async (id: string) => {
    if (authMode !== "mock") {
      const deleted = await deleteRemoteObject("/api/benefits", id)
      if (!deleted) {
        return false
      }
    }
    setBenefits((prev) => prev.filter((b) => b.id !== id))
    return true
  }

  const addProvision = async (provision: Omit<Provision, "id" | "ownerId">) => {
    if (!currentOwnerId) {
      console.warn("[hub-gw-data] Refusing to create provision without owner context")
      return false
    }

    let id = `provision-${Date.now()}`
    if (authMode !== "mock") {
      const remoteId = await createRemoteObject("/api/provisionen", {
        title: provision.title,
        category: provision.category,
        commission: provision.commission,
        fullDescription: provision.fullDescription || provision.description,
      })
      if (!remoteId) {
        return false
      }
      id = remoteId
    }
    setProvisionen((prev) => [
      ...prev,
      { ...provision, id, ownerId: currentOwnerId },
    ])
    return true
  }

  const updateProvision = (id: string, updates: Partial<Provision>) => {
    setProvisionen((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deleteProvision = async (id: string) => {
    if (authMode !== "mock") {
      const deleted = await deleteRemoteObject("/api/provisionen", id)
      if (!deleted) {
        return false
      }
    }
    setProvisionen((prev) => prev.filter((p) => p.id !== id))
    return true
  }

  const addLeistung = async (leistung: Omit<Leistung, "id" | "ownerId">) => {
    if (!currentOwnerId) {
      console.warn("[hub-gw-data] Refusing to create leistung without owner context")
      return false
    }

    let id = `leistung-${Date.now()}`
    if (authMode !== "mock") {
      const remoteId = await createRemoteObject("/api/leistungen", {
        title: leistung.title,
        category: leistung.category,
        skills: leistung.skills,
        hourlyRate: leistung.hourlyRate,
        location: leistung.location,
        rating: leistung.rating,
        fullDescription: leistung.fullDescription || leistung.description,
      })
      if (!remoteId) {
        return false
      }
      id = remoteId
    }

    setLeistungen((prev) => [
      ...prev,
      { ...leistung, id, ownerId: currentOwnerId },
    ])
    return true
  }

  const updateLeistung = (id: string, updates: Partial<Leistung>) => {
    setLeistungen((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }

  const deleteLeistung = async (id: string) => {
    if (authMode !== "mock") {
      const deleted = await deleteRemoteObject("/api/leistungen", id)
      if (!deleted) {
        return false
      }
    }
    setLeistungen((prev) => prev.filter((l) => l.id !== id))
    return true
  }

  const getMyBenefits = () =>
    currentOwnerId ? benefits.filter((b) => b.ownerId === currentOwnerId) : []
  const getMyProvisionen = () =>
    currentOwnerId ? provisionen.filter((p) => p.ownerId === currentOwnerId) : []
  const getMyLeistungen = () =>
    currentOwnerId ? leistungen.filter((l) => l.ownerId === currentOwnerId) : []

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
