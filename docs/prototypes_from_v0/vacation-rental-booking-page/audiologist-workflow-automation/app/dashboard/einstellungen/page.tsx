"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Building2, User, Bell, Shield } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Einstellungen</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre Praxis- und Kontoeinstellungen</p>
      </div>

      <div className="space-y-6">
        {/* Practice Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Praxisinformationen</h2>
          </div>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="practiceName">Praxisname</Label>
                <Input id="practiceName" defaultValue="Hörakkustik Mustermann" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="practiceId">Betriebsstättennummer</Label>
                <Input id="practiceId" defaultValue="123456789" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" defaultValue="Musterstraße 123, 12345 Berlin" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" type="tel" defaultValue="+49 30 12345678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" defaultValue="info@hoerakkustik-mustermann.de" />
              </div>
            </div>
          </div>
        </Card>

        {/* User Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Benutzerprofil</h2>
          </div>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname</Label>
                <Input id="firstName" defaultValue="Max" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname</Label>
                <Input id="lastName" defaultValue="Mustermann" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">E-Mail-Adresse</Label>
              <Input id="userEmail" type="email" defaultValue="max.mustermann@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rolle</Label>
              <Select defaultValue="admin">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="user">Benutzer</SelectItem>
                  <SelectItem value="viewer">Betrachter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Benachrichtigungen</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">E-Mail-Benachrichtigungen</p>
                <p className="text-sm text-muted-foreground">Erhalten Sie Updates per E-Mail</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Bericht-Erinnerungen</p>
                <p className="text-sm text-muted-foreground">Erinnerungen für ausstehende Berichte</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Patienten-Updates</p>
                <p className="text-sm text-muted-foreground">Benachrichtigungen über Patientenänderungen</p>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Sicherheit</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <Input id="currentPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input id="newPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input id="confirmPassword" type="password" />
            </div>
            <Button variant="outline" className="bg-transparent">
              Passwort ändern
            </Button>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg">
            <Save className="mr-2 w-5 h-5" />
            Einstellungen speichern
          </Button>
        </div>
      </div>
    </div>
  )
}
