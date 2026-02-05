"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Circle, FileText, MessageSquare } from "lucide-react"

const projectData = {
  1: {
    name: "Website Redesign",
    description:
      "Complete overhaul of the company website with modern design principles, improved UX, and responsive layouts across all devices.",
    status: "In Progress",
    milestones: [
      { name: "Discovery & Planning", completed: true },
      { name: "Wireframes & Design", completed: true },
      { name: "Development", completed: false },
      { name: "Testing & QA", completed: false },
      { name: "Launch", completed: false },
    ],
    files: [
      { name: "Design Mockups.fig", size: "2.4 MB" },
      { name: "Brand Guidelines.pdf", size: "1.8 MB" },
    ],
    activity: [
      { action: "Design review completed", date: "2 days ago" },
      { action: "Homepage mockup uploaded", date: "5 days ago" },
      { action: "Project kickoff meeting", date: "2 weeks ago" },
    ],
  },
}

export function ProjectView({ projectId }: { projectId: string }) {
  const project = projectData[projectId as keyof typeof projectData] || projectData[1]
  const [message, setMessage] = useState("")
  const [open, setOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Message sent:", message)
    setMessage("")
    setOpen(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <Badge variant="default">{project.status}</Badge>
        </div>
        <p className="text-muted-foreground">{project.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline/Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
            <CardDescription>Track progress through key milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.milestones.map((milestone, index) => (
                <div key={index} className="flex items-start gap-3">
                  {milestone.completed ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className={milestone.completed ? "font-medium" : "text-muted-foreground"}>{milestone.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates on this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.activity.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Files */}
        <Card>
          <CardHeader>
            <CardTitle>Project Files</CardTitle>
            <CardDescription>Documents and deliverables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.files.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Send Message */}
        <Card>
          <CardHeader>
            <CardTitle>Communication</CardTitle>
            <CardDescription>Send a message about this project</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message</DialogTitle>
                  <DialogDescription>Send a message about {project.name}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Type your message here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Send</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
