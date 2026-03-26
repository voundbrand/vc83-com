"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useData } from "@/lib/data-context"
import { Plus, Pencil, Trash2, Gift, Percent, Briefcase } from "lucide-react"
import { CreateBenefitModal } from "@/components/create-benefit-modal"
import { CreateProvisionModal } from "@/components/create-provision-modal"
import { CreateServiceModal } from "@/components/create-service-modal"

export default function MeineAngebotePage() {
  const {
    getMyBenefits,
    getMyProvisionen,
    getMyLeistungen,
    deleteBenefit,
    deleteProvision,
    deleteLeistung,
  } = useData()

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCreateBenefit, setShowCreateBenefit] = useState(false)
  const [showCreateProvision, setShowCreateProvision] = useState(false)
  const [showCreateLeistung, setShowCreateLeistung] = useState(false)

  const myBenefits = getMyBenefits()
  const myProvisionen = getMyProvisionen()
  const myLeistungen = getMyLeistungen()

  const handleDelete = async () => {
    if (!deleteConfirm) return
    if (isDeleting) return

    setIsDeleting(true)
    try {
      let deleted = false
      if (deleteConfirm.type === "benefit") deleted = await deleteBenefit(deleteConfirm.id)
      else if (deleteConfirm.type === "provision") deleted = await deleteProvision(deleteConfirm.id)
      else if (deleteConfirm.type === "leistung") deleted = await deleteLeistung(deleteConfirm.id)

      if (deleted) {
        setDeleteConfirm(null)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Meine Angebote</h1>
          <p className="mt-2 text-muted-foreground">
            Verwalten Sie hier Ihre Benefits, Provisionen und Leistungen
          </p>
        </div>

        <Tabs defaultValue="benefits" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="benefits" className="gap-2">
              <Gift className="h-4 w-4" />
              Benefits ({myBenefits.length})
            </TabsTrigger>
            <TabsTrigger value="provisionen" className="gap-2">
              <Percent className="h-4 w-4" />
              Provisionen ({myProvisionen.length})
            </TabsTrigger>
            <TabsTrigger value="leistungen" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Leistungen ({myLeistungen.length})
            </TabsTrigger>
          </TabsList>

          {/* Benefits Tab */}
          <TabsContent value="benefits" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateBenefit(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Neuer Benefit
              </Button>
            </div>

            {myBenefits.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Gift className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    Sie haben noch keine Benefits erstellt.
                    <br />
                    Klicken Sie auf &quot;Neuer Benefit&quot; um zu beginnen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myBenefits.map((benefit) => (
                  <Card key={benefit.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{benefit.title}</CardTitle>
                          <CardDescription>{benefit.category}</CardDescription>
                        </div>
                        {benefit.discount && (
                          <Badge variant="secondary">{benefit.discount}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {benefit.description}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" disabled>
                          <Pencil className="mr-1 h-4 w-4" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteConfirm({ type: "benefit", id: benefit.id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Provisionen Tab */}
          <TabsContent value="provisionen" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateProvision(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Neue Provision
              </Button>
            </div>

            {myProvisionen.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Percent className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    Sie haben noch keine Provisionen erstellt.
                    <br />
                    Klicken Sie auf &quot;Neue Provision&quot; um zu beginnen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myProvisionen.map((provision) => (
                  <Card key={provision.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{provision.title}</CardTitle>
                          <CardDescription>{provision.category}</CardDescription>
                        </div>
                        <Badge className="bg-accent text-accent-foreground">
                          {provision.commission}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {provision.description}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" disabled>
                          <Pencil className="mr-1 h-4 w-4" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteConfirm({ type: "provision", id: provision.id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Leistungen Tab */}
          <TabsContent value="leistungen" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateLeistung(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Neue Leistung
              </Button>
            </div>

            {myLeistungen.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    Sie haben noch keine Leistungen erstellt.
                    <br />
                    Klicken Sie auf &quot;Neue Leistung&quot; um zu beginnen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myLeistungen.map((leistung) => (
                  <Card key={leistung.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{leistung.title}</CardTitle>
                          <CardDescription>{leistung.category}</CardDescription>
                        </div>
                        {leistung.hourlyRate && (
                          <Badge variant="secondary">{leistung.hourlyRate}/h</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3 flex flex-wrap gap-1">
                        {leistung.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" disabled>
                          <Pencil className="mr-1 h-4 w-4" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteConfirm({ type: "leistung", id: leistung.id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Modals */}
      <CreateBenefitModal open={showCreateBenefit} onOpenChange={setShowCreateBenefit} />
      <CreateProvisionModal open={showCreateProvision} onOpenChange={setShowCreateProvision} />
      <CreateServiceModal open={showCreateLeistung} onOpenChange={setShowCreateLeistung} />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sind Sie sicher?</DialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Das Angebot wird
              dauerhaft gelöscht.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Lösche..." : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
