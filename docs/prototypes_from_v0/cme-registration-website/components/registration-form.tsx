"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react"

const personalInfoSchema = z.object({
  salutation: z.string().min(1, "Bitte wählen Sie eine Anrede"),
  firstName: z.string().min(2, "Vorname ist erforderlich"),
  lastName: z.string().min(2, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().optional(),
  doctorNumber: z.string().min(1, "Arztnummer/EFN ist erforderlich"),
  specialty: z.string().min(1, "Bitte wählen Sie eine Fachrichtung"),
})

const employerInfoSchema = z.object({
  employerPays: z.boolean(),
  institutionName: z.string().optional(),
  department: z.string().optional(),
  billingAddress: z.string().optional(),
  costCenter: z.string().optional(),
})

const confirmationSchema = z.object({
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: "Sie müssen die Datenschutzerklärung akzeptieren",
  }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Sie müssen die AGB akzeptieren",
  }),
})

type PersonalInfo = z.infer<typeof personalInfoSchema>
type EmployerInfo = z.infer<typeof employerInfoSchema>
type Confirmation = z.infer<typeof confirmationSchema>

interface RegistrationFormProps {
  courseId: string
  onSubmit: (data: any) => Promise<void>
}

export function RegistrationForm({ courseId, onSubmit }: RegistrationFormProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({})

  const {
    register: registerPersonal,
    handleSubmit: handleSubmitPersonal,
    formState: { errors: errorsPersonal },
    watch: watchPersonal,
  } = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: formData.personal,
  })

  const {
    register: registerEmployer,
    handleSubmit: handleSubmitEmployer,
    formState: { errors: errorsEmployer },
    watch: watchEmployer,
    setValue: setValueEmployer,
  } = useForm<EmployerInfo>({
    resolver: zodResolver(employerInfoSchema),
    defaultValues: formData.employer || { employerPays: false },
  })

  const {
    register: registerConfirmation,
    handleSubmit: handleSubmitConfirmation,
    formState: { errors: errorsConfirmation },
    setValue: setValueConfirmation,
    watch: watchConfirmation,
  } = useForm<Confirmation>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: { privacyAccepted: false, termsAccepted: false },
  })

  const employerPays = watchEmployer("employerPays")
  const privacyAccepted = watchConfirmation("privacyAccepted")
  const termsAccepted = watchConfirmation("termsAccepted")

  const onPersonalSubmit = (data: PersonalInfo) => {
    setFormData({ ...formData, personal: data })
    setStep(2)
  }

  const onEmployerSubmit = (data: EmployerInfo) => {
    setFormData({ ...formData, employer: data })
    setStep(3)
  }

  const onConfirmationSubmit = async (data: Confirmation) => {
    setIsSubmitting(true)
    try {
      await onSubmit({ ...formData, confirmation: data, courseId })
    } catch (error) {
      console.error("Registration failed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Schritt {step} von 3</span>
          <span className="text-sm text-muted-foreground">
            {step === 1 && "Persönliche Informationen"}
            {step === 2 && "Arbeitgeber-Informationen"}
            {step === 3 && "Überprüfung & Bestätigung"}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Personal Information */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Persönliche Informationen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPersonal(onPersonalSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="salutation">
                  Anrede <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) => registerPersonal("salutation").onChange({ target: { value } })}
                  defaultValue={formData.personal?.salutation}
                >
                  <SelectTrigger id="salutation">
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr-med">Dr. med.</SelectItem>
                    <SelectItem value="prof-dr-med">Prof. Dr. med.</SelectItem>
                    <SelectItem value="pd-dr-med">PD Dr. med.</SelectItem>
                    <SelectItem value="herr">Herr</SelectItem>
                    <SelectItem value="frau">Frau</SelectItem>
                  </SelectContent>
                </Select>
                {errorsPersonal.salutation && (
                  <p className="text-sm text-destructive">{errorsPersonal.salutation.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Vorname <span className="text-destructive">*</span>
                  </Label>
                  <Input id="firstName" {...registerPersonal("firstName")} placeholder="Max" />
                  {errorsPersonal.firstName && (
                    <p className="text-sm text-destructive">{errorsPersonal.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Nachname <span className="text-destructive">*</span>
                  </Label>
                  <Input id="lastName" {...registerPersonal("lastName")} placeholder="Mustermann" />
                  {errorsPersonal.lastName && (
                    <p className="text-sm text-destructive">{errorsPersonal.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  E-Mail-Adresse <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...registerPersonal("email")}
                  placeholder="max.mustermann@example.com"
                />
                {errorsPersonal.email && <p className="text-sm text-destructive">{errorsPersonal.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input id="phone" type="tel" {...registerPersonal("phone")} placeholder="+49 30 12345678" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctorNumber">
                  Arztnummer/EFN <span className="text-destructive">*</span>
                </Label>
                <Input id="doctorNumber" {...registerPersonal("doctorNumber")} placeholder="123456789" />
                <p className="text-xs text-muted-foreground">Erforderlich für die Ausstellung des CME-Zertifikats</p>
                {errorsPersonal.doctorNumber && (
                  <p className="text-sm text-destructive">{errorsPersonal.doctorNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">
                  Fachrichtung <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) => registerPersonal("specialty").onChange({ target: { value } })}
                  defaultValue={formData.personal?.specialty}
                >
                  <SelectTrigger id="specialty">
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allgemeinmedizin">Allgemeinmedizin</SelectItem>
                    <SelectItem value="kardiologie">Kardiologie</SelectItem>
                    <SelectItem value="onkologie">Onkologie</SelectItem>
                    <SelectItem value="notfallmedizin">Notfallmedizin</SelectItem>
                    <SelectItem value="diabetologie">Diabetologie</SelectItem>
                    <SelectItem value="psychiatrie">Psychiatrie</SelectItem>
                    <SelectItem value="geriatrie">Geriatrie</SelectItem>
                    <SelectItem value="andere">Andere</SelectItem>
                  </SelectContent>
                </Select>
                {errorsPersonal.specialty && (
                  <p className="text-sm text-destructive">{errorsPersonal.specialty.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="lg">
                  Weiter
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Employer Information */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Arbeitgeber-Informationen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitEmployer(onEmployerSubmit)} className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="employerPays"
                  checked={employerPays}
                  onCheckedChange={(checked) => setValueEmployer("employerPays", checked as boolean)}
                />
                <Label htmlFor="employerPays" className="font-normal cursor-pointer">
                  Mein Arbeitgeber übernimmt die Kosten
                </Label>
              </div>

              {employerPays && (
                <div className="space-y-6 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="institutionName">
                      Name der Einrichtung <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="institutionName"
                      {...registerEmployer("institutionName")}
                      placeholder="Universitätsklinikum Berlin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Abteilung</Label>
                    <Input id="department" {...registerEmployer("department")} placeholder="Kardiologie" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingAddress">Rechnungsadresse</Label>
                    <Input
                      id="billingAddress"
                      {...registerEmployer("billingAddress")}
                      placeholder="Musterstraße 123, 10115 Berlin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="costCenter">Kostenstelle (optional)</Label>
                    <Input id="costCenter" {...registerEmployer("costCenter")} placeholder="KST-12345" />
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 w-5 h-5" />
                  Zurück
                </Button>
                <Button type="submit" size="lg">
                  Weiter
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Überprüfung & Bestätigung</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitConfirmation(onConfirmationSubmit)} className="space-y-6">
              {/* Summary */}
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-foreground">Zusammenfassung</h3>

                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Persönliche Daten</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.personal?.firstName} {formData.personal?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{formData.personal?.email}</p>
                  <p className="text-sm text-muted-foreground">EFN: {formData.personal?.doctorNumber}</p>
                </div>

                {formData.employer?.employerPays && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Arbeitgeber-Informationen</p>
                    <p className="text-sm text-muted-foreground">{formData.employer?.institutionName}</p>
                    {formData.employer?.department && (
                      <p className="text-sm text-muted-foreground">Abteilung: {formData.employer?.department}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacyAccepted"
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => setValueConfirmation("privacyAccepted", checked as boolean)}
                  />
                  <Label htmlFor="privacyAccepted" className="font-normal cursor-pointer leading-relaxed">
                    Ich habe die{" "}
                    <a href="/datenschutz" className="text-primary hover:underline" target="_blank" rel="noreferrer">
                      Datenschutzerklärung
                    </a>{" "}
                    gelesen und akzeptiere diese. <span className="text-destructive">*</span>
                  </Label>
                </div>
                {errorsConfirmation.privacyAccepted && (
                  <p className="text-sm text-destructive">{errorsConfirmation.privacyAccepted.message}</p>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="termsAccepted"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setValueConfirmation("termsAccepted", checked as boolean)}
                  />
                  <Label htmlFor="termsAccepted" className="font-normal cursor-pointer leading-relaxed">
                    Ich habe die{" "}
                    <a href="/agb" className="text-primary hover:underline" target="_blank" rel="noreferrer">
                      Allgemeinen Geschäftsbedingungen
                    </a>{" "}
                    gelesen und akzeptiere diese. <span className="text-destructive">*</span>
                  </Label>
                </div>
                {errorsConfirmation.termsAccepted && (
                  <p className="text-sm text-destructive">{errorsConfirmation.termsAccepted.message}</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 w-5 h-5" />
                  Zurück
                </Button>
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Wird registriert...
                    </>
                  ) : (
                    "Verbindlich registrieren"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
