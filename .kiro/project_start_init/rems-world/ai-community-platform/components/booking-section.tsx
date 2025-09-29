"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, CheckCircle, Star } from "lucide-react";

// Mock booking data
const supportPackages = [
  {
    id: 1,
    name: "Quick Help Session",
    description: "Get unstuck with a 30-minute focused session",
    duration: "30 minutes",
    price: 97,
    features: ["Screen sharing", "Code review", "Q&A session", "Follow-up notes"],
    popular: false,
    stripePriceId: "price_quick_help",
  },
  {
    id: 2,
    name: "Deep Dive Consultation",
    description: "Comprehensive 60-minute strategy and implementation session",
    duration: "60 minutes",
    price: 197,
    features: [
      "Full project review",
      "Custom strategy",
      "Implementation plan",
      "Resource recommendations",
      "1-week follow-up",
    ],
    popular: true,
    stripePriceId: "price_deep_dive",
  },
  {
    id: 3,
    name: "VIP Intensive",
    description: "2-hour intensive session to solve complex problems",
    duration: "120 minutes",
    price: 397,
    features: [
      "Extended consultation",
      "Live coding session",
      "Custom solutions",
      "Priority support",
      "30-day follow-up",
    ],
    popular: false,
    stripePriceId: "price_vip_intensive",
  },
];

const mentors = [
  {
    id: 1,
    name: "Sarah Chen",
    title: "AI Workflow Expert",
    avatar: "/avatars/sarah.jpg",
    rating: 4.9,
    sessions: 245,
    specialties: ["Claude Prompting", "v0 Development", "Workflow Optimization"],
    nextAvailable: "Today 3:00 PM",
  },
  {
    id: 2,
    name: "Mike Rodriguez",
    title: "Full-Stack Developer",
    avatar: "/avatars/mike.jpg",
    rating: 4.8,
    sessions: 189,
    specialties: ["Next.js", "Database Design", "API Integration"],
    nextAvailable: "Tomorrow 10:00 AM",
  },
  {
    id: 3,
    name: "Alex Thompson",
    title: "Business Strategist",
    avatar: "/avatars/alex.jpg",
    rating: 4.9,
    sessions: 167,
    specialties: ["Client Acquisition", "Pricing Strategy", "Agency Scaling"],
    nextAvailable: "Today 5:00 PM",
  },
];

const testimonials = [
  {
    name: "Jessica Park",
    role: "Freelance Developer",
    content:
      "Sarah helped me optimize my Claude prompts and I'm now building websites 3x faster. Worth every penny!",
    rating: 5,
    avatar: "/avatars/jessica.jpg",
  },
  {
    name: "David Kim",
    role: "Agency Owner",
    content:
      "Alex's business strategy session helped me land my first $5K client. The ROI was immediate.",
    rating: 5,
    avatar: "/avatars/david.jpg",
  },
  {
    name: "Lisa Wang",
    role: "Startup Founder",
    content:
      "Mike's technical guidance saved me weeks of development time. Highly recommend the deep dive session.",
    rating: 5,
    avatar: "/avatars/lisa.jpg",
  },
];

export function BookingSection() {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBooking = async (packageId: number) => {
    setIsLoading(true);

    // In a real implementation, this would create a Stripe checkout session
    try {
      const selectedPkg = supportPackages.find((pkg) => pkg.id === packageId);
      if (!selectedPkg) return;

      // Mock Stripe checkout creation
      console.log("Creating Stripe checkout for:", selectedPkg.name);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In real implementation:
      // const response = await fetch('/api/create-checkout-session', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     priceId: selectedPkg.stripePriceId,
      //     mentorId: selectedMentor,
      //   }),
      // })
      // const { url } = await response.json()
      // window.location.href = url

      alert(`Booking ${selectedPkg.name} - Stripe integration would redirect to checkout here`);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Booking failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="booking" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black font-montserrat mb-4">
            Book Direct Support
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Get personalized help from our experts. Skip the wait and get unstuck fast with 1-on-1
            sessions.
          </p>
        </div>

        {/* Support Packages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {supportPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative hover:shadow-lg transition-all duration-300 ${
                pkg.popular ? "border-primary shadow-md scale-105" : ""
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{pkg.name}</CardTitle>
                <CardDescription className="text-base">{pkg.description}</CardDescription>
                <div className="pt-4">
                  <div className="text-4xl font-black text-primary">${pkg.price}</div>
                  <div className="text-sm text-muted-foreground">{pkg.duration}</div>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleBooking(pkg.id)}
                  disabled={isLoading}
                  variant={pkg.popular ? "default" : "outline"}
                >
                  {isLoading ? "Processing..." : "Book Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mentor Selection */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold font-montserrat text-center mb-8">
            Choose Your Mentor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <Card key={mentor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={mentor.avatar || "/placeholder.svg"} alt={mentor.name} />
                      <AvatarFallback>
                        {mentor.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-lg">{mentor.name}</h4>
                      <p className="text-muted-foreground text-sm">{mentor.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium ml-1">{mentor.rating}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">•</span>
                        <span className="text-sm text-muted-foreground">
                          {mentor.sessions} sessions
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Specialties:</h5>
                      <div className="flex flex-wrap gap-1">
                        {mentor.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        {mentor.nextAvailable}
                      </div>
                      <Button size="sm" variant="outline">
                        Select
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold font-montserrat text-center mb-8">What Members Say</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-card-foreground mb-4 italic">"{testimonial.content}"</p>
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={testimonial.avatar || "/placeholder.svg"}
                        alt={testimonial.name}
                      />
                      <AvatarFallback>
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-muted-foreground text-xs">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="text-center">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-bold font-montserrat">
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div>
                  <h4 className="font-semibold mb-2">How quickly can I book a session?</h4>
                  <p className="text-sm text-muted-foreground">
                    Most mentors have availability within 24-48 hours. Some offer same-day bookings.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">What if I need to reschedule?</h4>
                  <p className="text-sm text-muted-foreground">
                    You can reschedule up to 24 hours before your session with no penalty.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Do you offer refunds?</h4>
                  <p className="text-sm text-muted-foreground">
                    We offer a 100% satisfaction guarantee. If you're not happy, we'll refund your
                    session.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Can I book multiple sessions?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes! Many members book regular sessions for ongoing support and mentorship.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
