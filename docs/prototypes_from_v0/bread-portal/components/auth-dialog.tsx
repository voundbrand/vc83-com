"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogIn } from "lucide-react"
import { login, register } from "@/lib/auth"

interface AuthDialogProps {
  onAuthSuccess: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AuthDialog({ onAuthSuccess, trigger, open: controlledOpen, onOpenChange }: AuthDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [error, setError] = useState("")

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const result = login(email, password)
    if (result.success) {
      setOpen(false)
      onAuthSuccess()
    } else {
      setError(result.error || "Fehler beim Anmelden")
    }
  }

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const result = register(name, email, password)
    if (result.success) {
      setOpen(false)
      onAuthSuccess()
    } else {
      setError(result.error || "Fehler bei der Registrierung")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <LogIn className="mr-2 h-4 w-4" />
              Anmelden
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Willkommen bei PrivateBread</DialogTitle>
          <DialogDescription>Melden Sie sich an oder erstellen Sie ein Konto, um Brot zu kaufen</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Anmelden</TabsTrigger>
            <TabsTrigger value="register">Registrieren</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-Mail</Label>
                <Input id="login-email" name="email" type="email" placeholder="ihre@email.de" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Passwort</Label>
                <Input id="login-password" name="password" type="password" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Anmelden
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Name</Label>
                <Input id="register-name" name="name" placeholder="Ihr Name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">E-Mail</Label>
                <Input id="register-email" name="email" type="email" placeholder="ihre@email.de" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Passwort</Label>
                <Input id="register-password" name="password" type="password" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Konto erstellen
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
