"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type WorkspaceType = {
  id: string
  name: string
  type: string
  dailyRate: number
  hourlyRate?: number
  amenities: string[]
  image: string
}

export type BookingDetails = {
  workspace: WorkspaceType | null
  checkInDate: Date | undefined
  checkOutDate: Date | undefined
  bookingType: "daily" | "hourly"
  hours?: number
  totalPrice: number
}

type BookingContextType = {
  bookingDetails: BookingDetails
  setWorkspace: (workspace: WorkspaceType) => void
  setDates: (checkIn: Date | undefined, checkOut: Date | undefined) => void
  setBookingType: (type: "daily" | "hourly", hours?: number) => void
  calculateTotal: () => number
  clearBooking: () => void
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    workspace: null,
    checkInDate: undefined,
    checkOutDate: undefined,
    bookingType: "daily",
    totalPrice: 0,
  })

  const setWorkspace = (workspace: WorkspaceType) => {
    setBookingDetails((prev) => ({
      ...prev,
      workspace,
      totalPrice: calculateTotalWithWorkspace(workspace, prev),
    }))
  }

  const setDates = (checkIn: Date | undefined, checkOut: Date | undefined) => {
    setBookingDetails((prev) => ({
      ...prev,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalPrice: calculateTotalWithDates(checkIn, checkOut, prev),
    }))
  }

  const setBookingType = (type: "daily" | "hourly", hours?: number) => {
    setBookingDetails((prev) => ({
      ...prev,
      bookingType: type,
      hours,
      totalPrice: calculateTotalWithType(type, hours, prev),
    }))
  }

  const calculateTotalWithWorkspace = (workspace: WorkspaceType, current: BookingDetails): number => {
    if (!workspace || !current.checkInDate) return 0

    if (current.bookingType === "hourly" && workspace.hourlyRate && current.hours) {
      return workspace.hourlyRate * current.hours
    }

    if (current.checkOutDate) {
      const days = Math.ceil((current.checkOutDate.getTime() - current.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      return workspace.dailyRate * Math.max(1, days)
    }

    return workspace.dailyRate
  }

  const calculateTotalWithDates = (
    checkIn: Date | undefined,
    checkOut: Date | undefined,
    current: BookingDetails,
  ): number => {
    if (!current.workspace || !checkIn) return 0

    if (current.bookingType === "hourly" && current.workspace.hourlyRate && current.hours) {
      return current.workspace.hourlyRate * current.hours
    }

    if (checkOut) {
      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      return current.workspace.dailyRate * Math.max(1, days)
    }

    return current.workspace.dailyRate
  }

  const calculateTotalWithType = (
    type: "daily" | "hourly",
    hours: number | undefined,
    current: BookingDetails,
  ): number => {
    if (!current.workspace || !current.checkInDate) return 0

    if (type === "hourly" && current.workspace.hourlyRate && hours) {
      return current.workspace.hourlyRate * hours
    }

    if (type === "daily" && current.checkOutDate) {
      const days = Math.ceil((current.checkOutDate.getTime() - current.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      return current.workspace.dailyRate * Math.max(1, days)
    }

    return current.workspace.dailyRate
  }

  const calculateTotal = (): number => {
    return bookingDetails.totalPrice
  }

  const clearBooking = () => {
    setBookingDetails({
      workspace: null,
      checkInDate: undefined,
      checkOutDate: undefined,
      bookingType: "daily",
      totalPrice: 0,
    })
  }

  return (
    <BookingContext.Provider
      value={{
        bookingDetails,
        setWorkspace,
        setDates,
        setBookingType,
        calculateTotal,
        clearBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider")
  }
  return context
}
