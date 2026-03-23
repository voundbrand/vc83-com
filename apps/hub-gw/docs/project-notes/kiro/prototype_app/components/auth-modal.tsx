"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { UserProfile } from "@/lib/user-context"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: (user: UserProfile) => void
  defaultTab?: "signin" | "register"
}

export function AuthModal({ open, onOpenChange, onLogin, defaultTab = "signin" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "register">(defaultTab)
  
  // Sign in fields
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  
  // Register fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [registerNumber, setRegisterNumber] = useState("")
  const [taxId, setTaxId] = useState("")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [industry, setIndustry] = useState("")

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mock sign in - create a user profile based on email
    const userProfile: UserProfile = {
      name: signInEmail.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      email: signInEmail,
      phone: "+49 151 12345678",
      avatar: "/diverse-user-avatars.png",
      business: {
        legalName: "Meine Firma GmbH",
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
    
    onLogin(userProfile)
    onOpenChange(false)
    resetForm()
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    
    const userProfile: UserProfile = {
      name,
      email,
      phone,
      avatar: "/diverse-user-avatars.png",
      business: {
        legalName: companyName,
        registerNumber,
        taxId,
        address: {
          street,
          city,
          postalCode,
          country: "Deutschland",
        },
        foundedDate: new Date().toISOString().split('T')[0],
        industry,
      },
    }
    
    onLogin(userProfile)
    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setSignInEmail("")
    setSignInPassword("")
    setName("")
    setEmail("")
    setPassword("")
    setPhone("")
    setCompanyName("")
    setRegisterNumber("")
    setTaxId("")
    setStreet("")
    setCity("")
    setPostalCode("")
    setIndustry("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Willkommen bei Gründungswerft</DialogTitle>
          <DialogDescription>
            Demo-Modus: Alle Eingaben werden akzeptiert
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "register")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Anmelden</TabsTrigger>
            <TabsTrigger value="register">Registrieren</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="mt-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="signin-email">E-Mail</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="max@beispiel.de"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signin-password">Passwort</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="********"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <Button type="button" variant="link" className="h-auto p-0 text-sm text-muted-foreground">
                  Passwort vergessen?
                </Button>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Abbrechen
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Anmelden</Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Persönliche Daten</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Max Mustermann"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="register-email">E-Mail</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="max@beispiel.de"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="register-password">Passwort</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+49 151 12345678"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Unternehmensdaten</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Firmenname</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Meine Firma GmbH"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="registerNumber">Handelsregister-Nr.</Label>
                      <Input
                        id="registerNumber"
                        value={registerNumber}
                        onChange={(e) => setRegisterNumber(e.target.value)}
                        placeholder="HRB 123456"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="taxId">USt-IdNr.</Label>
                      <Input
                        id="taxId"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="DE123456789"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="street">Straße</Label>
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Hauptstraße 42"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="postalCode">PLZ</Label>
                      <Input
                        id="postalCode"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="10115"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="city">Stadt</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Berlin"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="industry">Branche</Label>
                    <Input
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="IT & Software"
                      required
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Abbrechen
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Registrieren</Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
