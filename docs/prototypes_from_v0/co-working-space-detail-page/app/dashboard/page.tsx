"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Key, Wifi, Coffee, Tv, Printer, FileText, Download, Calendar, MapPin, Copy, Check } from "lucide-react"
import { useState } from "react"

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  useEffect(() => {
    // Redirect non-authenticated or guest users
    if (!user || user.isGuest) {
      router.push("/")
    }
  }, [user, router])

  if (!user || user.isGuest) {
    return null
  }

  const copyToClipboard = (text: string, itemName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(itemName)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  // Mock upcoming bookings
  const upcomingBookings = [
    {
      id: "1",
      workspace: "Studio Suite",
      date: "December 15, 2024",
      time: "9:00 AM - 5:00 PM",
      status: "confirmed",
      code: "MS-ABC123XYZ",
    },
    {
      id: "2",
      workspace: "Executive Suite",
      date: "December 22, 2024",
      time: "10:00 AM - 6:00 PM",
      status: "confirmed",
      code: "MS-DEF456UVW",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Welcome back, {user.name}</h1>
            <p className="text-muted-foreground">Access your workspace information, bookings, and helpful guides</p>
          </div>

          <Tabs defaultValue="access" className="space-y-6">
            <TabsList>
              <TabsTrigger value="access">Access & Codes</TabsTrigger>
              <TabsTrigger value="bookings">My Bookings</TabsTrigger>
              <TabsTrigger value="guides">Equipment Guides</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* Access & Codes Tab */}
            <TabsContent value="access" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Door Access Code */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      Door Access Code
                    </CardTitle>
                    <CardDescription>Main entrance access code</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                      <span className="text-3xl font-bold font-mono">4582</span>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard("4582", "door-code")}>
                        {copiedItem === "door-code" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Valid for active bookings. Code may change monthly for security.
                    </p>
                  </CardContent>
                </Card>

                {/* WiFi Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wifi className="h-5 w-5 text-primary" />
                      WiFi Network
                    </CardTitle>
                    <CardDescription>High-speed internet access</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Network Name</p>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-mono font-medium">l4yercak3Studio_Pro</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("l4yercak3Studio_Pro", "wifi-name")}
                        >
                          {copiedItem === "wifi-name" ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Password</p>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-mono font-medium">Work2024Secure!</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("Work2024Secure!", "wifi-password")}
                        >
                          {copiedItem === "wifi-password" ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location & Hours */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Location & Hours
                    </CardTitle>
                    <CardDescription>Find us at the marketplace</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">Traditional Marketplace House</p>
                      <p className="text-sm text-muted-foreground">123 Marketplace Street</p>
                      <p className="text-sm text-muted-foreground">City Center, 12345</p>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="font-medium text-sm mb-2">Access Hours</p>
                      <p className="text-sm text-muted-foreground">Mon-Fri: 6:00 AM - 10:00 PM</p>
                      <p className="text-sm text-muted-foreground">Sat-Sun: 8:00 AM - 8:00 PM</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Need Help?
                    </CardTitle>
                    <CardDescription>We're here to assist you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email Support</p>
                      <p className="font-medium">support@l4yercak3studio.com</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <p className="font-medium">+1 (555) 123-4567</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Emergency Contact</p>
                      <p className="font-medium">+1 (555) 999-0000</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* My Bookings Tab */}
            <TabsContent value="bookings" className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Upcoming Bookings</h2>
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{booking.workspace}</h3>
                              <Badge variant="default" className="bg-green-600">
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{booking.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="ml-6">{booking.time}</span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground">Booking Reference</p>
                              <p className="font-mono text-sm">{booking.code}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                            <Button variant="ghost" size="sm">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <Button className="w-full md:w-auto" asChild>
                  <a href="/floor-plan">Book Another Space</a>
                </Button>
              </div>
            </TabsContent>

            {/* Equipment Guides Tab */}
            <TabsContent value="guides" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Coffee Machine Guide */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coffee className="h-5 w-5 text-primary" />
                      Coffee Machine
                    </CardTitle>
                    <CardDescription>Espresso & coffee brewing guide</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Quick Start:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Turn on the machine (switch on left side)</li>
                        <li>Wait for green ready light (about 2 minutes)</li>
                        <li>Place cup under spout</li>
                        <li>Select desired beverage on touchscreen</li>
                        <li>Press start button</li>
                      </ol>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download Full Guide
                    </Button>
                  </CardContent>
                </Card>

                {/* TV & Conference Guide */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tv className="h-5 w-5 text-primary" />
                      Smart TVs & Conferencing
                    </CardTitle>
                    <CardDescription>Display and video call setup</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Connection Guide:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Press power on TV remote</li>
                        <li>Select input source (HDMI 1 for laptop)</li>
                        <li>For wireless: Use screen mirroring option</li>
                        <li>Audio: Adjust volume with remote</li>
                        <li>Video calls: Built-in camera & mic ready</li>
                      </ol>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download Full Guide
                    </Button>
                  </CardContent>
                </Card>

                {/* Printer & Scanner Guide */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Printer className="h-5 w-5 text-primary" />
                      Printer & Scanner
                    </CardTitle>
                    <CardDescription>Printing and scanning instructions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Printing:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Ensure printer is on (light indicator)</li>
                        <li>Connect to WiFi network</li>
                        <li>Select "MarketplaceStudio_Printer"</li>
                        <li>Print from any device</li>
                        <li>Retrieve from output tray</li>
                      </ol>
                      <p className="font-medium mt-3">Scanning:</p>
                      <p className="text-muted-foreground">
                        Place document face down, press "Scan" button, check email.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download Full Guide
                    </Button>
                  </CardContent>
                </Card>

                {/* Studio Equipment Guide */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tv className="h-5 w-5 text-primary" />
                      Studio Recording Equipment
                    </CardTitle>
                    <CardDescription>Audio & video recording setup</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Studio Setup:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Power on audio interface (control desk)</li>
                        <li>Connect microphones to channels 1-4</li>
                        <li>Adjust input levels (green = good)</li>
                        <li>Monitor with provided headphones</li>
                        <li>Recording software pre-installed on control PC</li>
                      </ol>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download Full Guide
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <CardContent className="p-6">
                    <FileText className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">House Rules</h3>
                    <p className="text-sm text-muted-foreground mb-4">Guidelines for respectful space usage</p>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <CardContent className="p-6">
                    <FileText className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Safety Information</h3>
                    <p className="text-sm text-muted-foreground mb-4">Emergency procedures and contacts</p>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <CardContent className="p-6">
                    <FileText className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Membership Agreement</h3>
                    <p className="text-sm text-muted-foreground mb-4">Terms and conditions of use</p>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <CardContent className="p-6">
                    <FileText className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Equipment Manual</h3>
                    <p className="text-sm text-muted-foreground mb-4">Complete guide for all equipment</p>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <CardContent className="p-6">
                    <FileText className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Parking Information</h3>
                    <p className="text-sm text-muted-foreground mb-4">Parking options and directions</p>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <CardContent className="p-6">
                    <FileText className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Floor Plan PDF</h3>
                    <p className="text-sm text-muted-foreground mb-4">Detailed layout and room labels</p>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
