"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface BookingFormLabels {
  name: string
  email: string
  course: string
  date: string
  message: string
  submit: string
  selectPlaceholder: string
}

interface BookingSectionProps {
  title: string
  subtitle: string
  formLabels: BookingFormLabels
  courseOptions: { title: string }[]
}

export function BookingSection({ title, subtitle, formLabels, courseOptions }: BookingSectionProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    course: "",
    date: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: "Anfrage gesendet!",
      description: "Wir melden uns in Kürze bei Ihnen.",
    })
    setFormData({ name: "", email: "", course: "", date: "", message: "" })
  }

  return (
    <section id="contact" className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4 text-balance">{title}</h2>
          <p className="text-xl text-muted-foreground text-balance">{subtitle}</p>
        </div>

        <Card className="bg-card shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">{formLabels.submit}</CardTitle>
            <CardDescription>Wir freuen uns auf Ihre Nachricht</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{formLabels.name}</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{formLabels.email}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="max@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">{formLabels.course}</Label>
                <Select value={formData.course} onValueChange={(value) => setFormData({ ...formData, course: value })}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder={formLabels.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {courseOptions.map((course, index) => (
                      <SelectItem key={index} value={course.title}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">{formLabels.date}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{formLabels.message}</Label>
                <Textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Besondere Wünsche oder Fragen..."
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {formLabels.submit}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
