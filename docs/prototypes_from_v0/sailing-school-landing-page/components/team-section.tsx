import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TeamMember {
  name: string
  role: string
  bio: string
}

interface TeamSectionProps {
  title: string
  subtitle: string
  members: TeamMember[]
}

export function TeamSection({ title, subtitle, members }: TeamSectionProps) {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 text-balance">{title}</h2>
          <p className="text-xl text-muted-foreground text-balance">{subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {members.map((member, index) => (
            <Card key={index} className="text-center bg-card hover:shadow-lg transition-shadow">
              <CardHeader className="items-center">
                <Avatar className="h-40 w-40 mb-4">
                  <AvatarImage
                    src={`/.jpg?height=200&width=200&query=${encodeURIComponent(`professional portrait ${member.name} sailing instructor`)}`}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl font-serif text-primary">{member.name}</CardTitle>
                <CardDescription className="text-base font-medium">{member.role}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 leading-relaxed">{member.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
