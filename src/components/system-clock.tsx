"use client"

import { useState, useEffect } from "react"

export function SystemClock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}`)
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="retro-button px-3 py-1">
      <span className="font-pixel text-xs text-purple-600">
        {time || "00:00"}
      </span>
    </div>
  )
}