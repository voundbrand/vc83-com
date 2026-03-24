"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EditableHeading, EditableParagraph, EditableText } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"

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
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="py-28 px-4 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          {cmsEnabled ? (
            <>
              <EditableHeading
                page="home"
                section="team"
                contentKey="title"
                fallback={title}
                level={2}
                className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 text-balance"
              />
              <EditableParagraph
                page="home"
                section="team"
                contentKey="subtitle"
                fallback={subtitle}
                className="text-xl text-muted-foreground text-balance"
              />
            </>
          ) : (
            <>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 text-balance">{title}</h2>
              <p className="text-xl text-muted-foreground text-balance">{subtitle}</p>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                <CardTitle className="text-2xl font-serif text-primary">
                  {cmsEnabled ? (
                    <EditableText
                      page="home"
                      section="team"
                      contentKey={`member_${index + 1}_name`}
                      fallback={member.name}
                    />
                  ) : (
                    member.name
                  )}
                </CardTitle>
                <CardDescription className="text-base font-medium">
                  {cmsEnabled ? (
                    <EditableText
                      page="home"
                      section="team"
                      contentKey={`member_${index + 1}_role`}
                      fallback={member.role}
                    />
                  ) : (
                    member.role
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 leading-relaxed">
                  {cmsEnabled ? (
                    <EditableText
                      page="home"
                      section="team"
                      contentKey={`member_${index + 1}_bio`}
                      fallback={member.bio}
                    />
                  ) : (
                    member.bio
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
