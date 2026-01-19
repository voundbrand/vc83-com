"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, FileText, Download, Eye } from "lucide-react"
import Link from "next/link"
import { demoReports } from "@/lib/demo-data"

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredReports = demoReports.filter(
    (report) =>
      report.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Berichte</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Versicherungsberichte</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/berichte/neu">
            <Plus className="mr-2 w-5 h-5" />
            Neuer Bericht
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Bericht suchen (Patient, Typ...)"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{report.patientName}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{report.type}</span>
                    <span>•</span>
                    <span>{new Date(report.date).toLocaleDateString("de-DE")}</span>
                    <span>•</span>
                    <span>{report.insuranceProvider}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    report.status === "Abgeschlossen" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {report.status}
                </span>
                <Button variant="outline" size="icon" className="bg-transparent" asChild>
                  <Link href={`/dashboard/berichte/${report.id}`}>
                    <Eye className="w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="icon" className="bg-transparent">
                  <Download className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredReports.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Keine Berichte gefunden</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Versuchen Sie eine andere Suchanfrage" : "Erstellen Sie Ihren ersten Bericht"}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/dashboard/berichte/neu">
                  <Plus className="mr-2 w-5 h-5" />
                  Neuer Bericht
                </Link>
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
