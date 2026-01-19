"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, MoreVertical, User } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { demoPatients } from "@/lib/demo-data"

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPatients = demoPatients.filter(
    (patient) =>
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.insuranceNumber.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Patienten</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Patientendaten</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/patienten/neu">
            <Plus className="mr-2 w-5 h-5" />
            Neuer Patient
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Patient suchen (Name, Versicherungsnummer...)"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Patients List */}
      <div className="space-y-4">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>Geb.: {new Date(patient.dateOfBirth).toLocaleDateString("de-DE")}</span>
                    <span>•</span>
                    <span>{patient.insuranceProvider}</span>
                    <span>•</span>
                    <span>Letzter Besuch: {new Date(patient.lastVisit).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild className="bg-transparent">
                  <Link href={`/dashboard/patienten/${patient.id}`}>Details</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/patienten/${patient.id}/bearbeiten`}>Bearbeiten</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/berichte/neu?patientId=${patient.id}`}>Bericht erstellen</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Löschen</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}

        {filteredPatients.length === 0 && (
          <Card className="p-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Keine Patienten gefunden</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Versuchen Sie eine andere Suchanfrage" : "Fügen Sie Ihren ersten Patienten hinzu"}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/dashboard/patienten/neu">
                  <Plus className="mr-2 w-5 h-5" />
                  Neuer Patient
                </Link>
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
