"use client"

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
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"
import { subscriptionPlans, createSubscription } from "@/lib/subscriptions"
import { getCurrentUser } from "@/lib/auth"
import { AuthDialog } from "@/components/auth-dialog"

interface SubscriptionDialogProps {
  onSubscribe?: () => void
}

export function SubscriptionDialog({ onSubscribe }: SubscriptionDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium" | "deluxe">("premium")
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("biweekly")
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const { toast } = useToast()

  const handleSubscribe = () => {
    const user = getCurrentUser()
    if (!user) {
      setOpen(false)
      setShowAuthDialog(true)
      return
    }

    const plan = subscriptionPlans.find((p) => p.type === selectedPlan)
    if (!plan) return

    createSubscription({
      userId: user.id,
      planName: plan.name,
      planType: plan.type,
      frequency,
      priceEur: plan.priceEur,
      priceBreadcoin: plan.priceBreadcoin,
      breadTypes: plan.breadTypes,
    })

    setOpen(false)
    toast({
      title: "BrotAbo erfolgreich abgeschlossen!",
      description: "Sehen Sie die Details in Ihrem Profil.",
    })
    window.location.reload()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" size="lg" className="gap-2">
            <Sparkles className="h-5 w-5" />
            BrotAbo starten
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl">BrotAbo - Ihr frisches Brot im Abo</DialogTitle>
            <DialogDescription>
              Wählen Sie Ihren perfekten Plan und erhalten Sie regelmäßig frisches, handwerkliches Brot
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Plan Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Wählen Sie Ihren Plan</Label>
              <div className="grid gap-4 md:grid-cols-3">
                {subscriptionPlans.map((plan) => (
                  <button
                    key={plan.type}
                    onClick={() => setSelectedPlan(plan.type)}
                    className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                      selectedPlan === plan.type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {plan.popular && <Badge className="absolute -top-2 right-4">Beliebt</Badge>}
                    <h3 className="font-serif text-lg font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                    <div className="mt-3">
                      <p className="font-serif text-2xl font-bold">€{plan.priceEur}</p>
                      <p className="text-xs text-muted-foreground">₿{plan.priceBreadcoin} BC</p>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Lieferfrequenz</Label>
              <RadioGroup value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="font-normal cursor-pointer">
                    Wöchentlich - Frisches Brot jede Woche
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="biweekly" id="biweekly" />
                  <Label htmlFor="biweekly" className="font-normal cursor-pointer">
                    Zweiwöchentlich - Alle 2 Wochen (Empfohlen)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="font-normal cursor-pointer">
                    Monatlich - Einmal pro Monat
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleSubscribe} className="w-full" size="lg">
              Jetzt BrotAbo abschließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthSuccess={() => {
          setShowAuthDialog(false)
          setOpen(true)
        }}
      />
    </>
  )
}
