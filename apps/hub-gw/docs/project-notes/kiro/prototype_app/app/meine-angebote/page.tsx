"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/lib/data-context"
import { Plus, Pencil, Trash2, Gift, Percent, Briefcase } from "lucide-react"
import Image from "next/image"
import { EditBenefitDialog } from "@/components/edit-benefit-dialog"
import { EditProvisionDialog } from "@/components/edit-provision-dialog"
import { EditLeistungDialog } from "@/components/edit-leistung-dialog"
import { CreateBenefitModal } from "@/components/create-benefit-modal"
import { CreateProvisionModal } from "@/components/create-provision-modal"
import { CreateServiceModal } from "@/components/create-service-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function MeineAngebotePage() {
  const { getMyBenefits, getMyProvisionen, getMyLeistungen, deleteBenefit, deleteProvision, deleteLeistung } = useData()
  
  const [editingBenefit, setEditingBenefit] = useState<string | null>(null)
  const [editingProvision, setEditingProvision] = useState<string | null>(null)
  const [editingLeistung, setEditingLeistung] = useState<string | null>(null)
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null)
  
  const [showCreateBenefit, setShowCreateBenefit] = useState(false)
  const [showCreateProvision, setShowCreateProvision] = useState(false)
  const [showCreateLeistung, setShowCreateLeistung] = useState(false)

  const myBenefits = getMyBenefits()
  const myProvisionen = getMyProvisionen()
  const myLeistungen = getMyLeistungen()

  const handleDelete = () => {
    if (!deleteConfirm) return
    
    if (deleteConfirm.type === 'benefit') {
      deleteBenefit(deleteConfirm.id)
    } else if (deleteConfirm.type === 'provision') {
      deleteProvision(deleteConfirm.id)
    } else if (deleteConfirm.type === 'leistung') {
      deleteLeistung(deleteConfirm.id)
    }
    setDeleteConfirm(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Meine Angebote</h1>
          <p className="text-muted-foreground mt-2">
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
                  <Gift className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Sie haben noch keine Benefits erstellt.<br />
                    Klicken Sie auf "Neuer Benefit" um zu beginnen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myBenefits.map(benefit => (
                  <Card key={benefit.id} className="overflow-hidden">
                    {benefit.image && (
                      <div className="relative h-40 bg-muted">
                        <Image
                          src={benefit.image}
                          alt={benefit.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
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
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {benefit.description}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditingBenefit(benefit.id)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm({ type: 'benefit', id: benefit.id })}
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
                  <Percent className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Sie haben noch keine Provisionen erstellt.<br />
                    Klicken Sie auf "Neue Provision" um zu beginnen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myProvisionen.map(provision => (
                  <Card key={provision.id} className="overflow-hidden">
                    {provision.image && (
                      <div className="relative h-40 bg-muted">
                        <Image
                          src={provision.image}
                          alt={provision.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
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
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {provision.description}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditingProvision(provision.id)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm({ type: 'provision', id: provision.id })}
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
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Sie haben noch keine Leistungen erstellt.<br />
                    Klicken Sie auf "Neue Leistung" um zu beginnen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myLeistungen.map(leistung => (
                  <Card key={leistung.id} className="overflow-hidden">
                    {leistung.image && (
                      <div className="relative h-40 bg-muted">
                        <Image
                          src={leistung.image}
                          alt={leistung.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
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
                      <div className="flex flex-wrap gap-1 mb-3">
                        {leistung.skills.slice(0, 3).map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditingLeistung(leistung.id)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm({ type: 'leistung', id: leistung.id })}
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

      {/* Edit Dialogs */}
      {editingBenefit && (
        <EditBenefitDialog
          benefitId={editingBenefit}
          open={!!editingBenefit}
          onOpenChange={(open) => !open && setEditingBenefit(null)}
        />
      )}
      {editingProvision && (
        <EditProvisionDialog
          provisionId={editingProvision}
          open={!!editingProvision}
          onOpenChange={(open) => !open && setEditingProvision(null)}
        />
      )}
      {editingLeistung && (
        <EditLeistungDialog
          leistungId={editingLeistung}
          open={!!editingLeistung}
          onOpenChange={(open) => !open && setEditingLeistung(null)}
        />
      )}

      {/* Create Modals */}
      <CreateBenefitModal 
        open={showCreateBenefit} 
        onOpenChange={setShowCreateBenefit} 
      />
      <CreateProvisionModal 
        open={showCreateProvision} 
        onOpenChange={setShowCreateProvision} 
      />
      <CreateServiceModal 
        open={showCreateLeistung} 
        onOpenChange={setShowCreateLeistung} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Das Angebot wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
