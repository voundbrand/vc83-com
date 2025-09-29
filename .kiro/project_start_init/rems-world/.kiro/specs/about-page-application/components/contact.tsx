"use client";

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, Send, Linkedin, Github, Phone } from "lucide-react";

export function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2000));

    alert("Thanks for your message! I'll get back to you soon. (This is a demo)");
    setFormData({ name: "", email: "", message: "" });
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <section id="contact" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">Let's Connect</h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              Interested in discussing how I can contribute to PostHog's success? I'd love to hear
              from you!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Send a Message
                </CardTitle>
                <CardDescription>
                  Drop me a line and I'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      name="name"
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Input
                      name="email"
                      type="email"
                      placeholder="your.email@company.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Textarea
                      name="message"
                      placeholder="Tell me about the opportunity or just say hello!"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="bg-background resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                  <CardDescription>
                    Multiple ways to reach me for different types of conversations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">john.smith@email.com</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">+49 151 404 27 103</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Linkedin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">LinkedIn</p>
                      <p className="text-sm text-muted-foreground">linkedin.com/in/johnsmith</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Github className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">github.com/johnsmith</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-primary">Ready to Join PostHog</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    I'm excited about the opportunity to bring my sales expertise and technical
                    curiosity to PostHog's innovative team. Let's discuss how I can help drive
                    growth and success!
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Schedule a Call
                    </Button>
                    <Button size="sm" variant="outline">
                      View Portfolio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
