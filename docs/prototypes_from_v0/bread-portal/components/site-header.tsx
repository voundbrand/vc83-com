"use client"

import { useState, useEffect } from "react"
import { Wheat } from "lucide-react"
import { AddBreadDialog } from "@/components/add-bread-dialog"
import { AuthDialog } from "@/components/auth-dialog"
import { UserMenu } from "@/components/user-menu"
import { CartIcon } from "@/components/cart-icon"
import { getCurrentUser } from "@/lib/auth"

export function SiteHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(!!getCurrentUser())
  }, [])

  const handleAuthChange = () => {
    setIsAuthenticated(!!getCurrentUser())
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <Wheat className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight md:text-3xl">PrivateBread.com</h1>
              <p className="text-sm text-muted-foreground">Handwerkliches hausgemachtes Brot</p>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <CartIcon />
            {isAuthenticated ? (
              <>
                <AddBreadDialog />
                <UserMenu onLogout={handleAuthChange} />
              </>
            ) : (
              <AuthDialog onAuthSuccess={handleAuthChange} />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
