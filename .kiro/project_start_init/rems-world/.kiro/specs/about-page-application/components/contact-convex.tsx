"use client";

import type React from "react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  MessageSquare,
  Send,
  Linkedin,
  Github,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { withRetry } from "@/lib/retry";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useLanguage } from "@/contexts/language-context";
import { CalButton } from "@/components/cal-button";
import { XIcon } from "@/components/icons/x-icon";

export function ContactConvex() {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const isOnline = useOnlineStatus();

  // Convex mutation
  const submitContact = useMutation(api.contacts.submitContact);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      await withRetry(
        async () => {
          await submitContact({
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
          });
        },
        {
          maxAttempts: 3,
          delay: 1000,
          onRetry: (error, attempt) => {
            console.log(`Retrying contact form submission (attempt ${attempt})`);
          },
        },
      );

      // Send email notification
      try {
        const emailResponse = await fetch("/api/send-contact-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Failed to send email notification");
        }
      } catch (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the whole submission if email fails
      }

      setSubmitStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus("idle");
      }, 5000);
    } catch (error) {
      console.error("Failed to submit contact form:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
              {t("contact.title")}
            </h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              {t("contact.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {t("contact.form.title")}
                  </CardTitle>
                  <CardDescription>{t("contact.form.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Input
                        name="name"
                        placeholder={t("contact.form.name")}
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="bg-background"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Input
                        name="email"
                        type="email"
                        placeholder={t("contact.form.email")}
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="bg-background"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Input
                        name="subject"
                        placeholder={t("contact.form.subject")}
                        value={formData.subject}
                        onChange={handleChange}
                        className="bg-background"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Textarea
                        name="message"
                        placeholder={t("contact.form.message")}
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={4}
                        className="bg-background resize-none"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Status Messages */}
                    {submitStatus === "success" && (
                      <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          {t("contact.form.success")}
                        </AlertDescription>
                      </Alert>
                    )}

                    {submitStatus === "error" && (
                      <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                          {t("contact.form.error")}
                        </AlertDescription>
                      </Alert>
                    )}

                    {!isOnline && (
                      <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                        <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <AlertDescription className="text-orange-800 dark:text-orange-200">
                          {t("contact.form.offline")}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !formData.name.trim() ||
                        !formData.email.trim() ||
                        !formData.message.trim()
                      }
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("contact.form.sending")}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {t("contact.form.send")}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Ready to See If I'm PostHog Material - Now under Contact Form */}
              <Card className="border-primary/20 gap-3">
                <CardHeader>
                  <CardTitle className="text-primary">{t("contact.info.ready")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("contact.info.readyDescription")}
                  </p>
                  <div className="flex gap-2">
                    <CalButton size="sm" className="bg-primary hover:bg-primary/90">
                      {t("contact.info.scheduleCall")}
                    </CalButton>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("resume")?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      {t("contact.info.viewPortfolio")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("contact.info.title")}</CardTitle>
                  <CardDescription>{t("contact.info.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a
                    href="mailto:remington@voundbrand.com"
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{t("contact.info.email")}</p>
                      <p className="text-sm text-muted-foreground">remington@voundbrand.com</p>
                    </div>
                  </a>

                  <a
                    href="tel:+4915140427103"
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{t("contact.info.phone")}</p>
                      <p className="text-sm text-muted-foreground">+49 151 40427103</p>
                    </div>
                  </a>

                  <a
                    href="https://www.linkedin.com/in/therealremington"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <Linkedin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">LinkedIn</p>
                      <p className="text-sm text-muted-foreground">
                        linkedin.com/in/therealremington
                      </p>
                    </div>
                  </a>

                  <a
                    href="https://github.com/voundbrand"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <Github className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">github.com/voundbrand</p>
                    </div>
                  </a>

                  <a
                    href="https://x.com/notcleverhandle"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <XIcon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">X (Twitter)</p>
                      <p className="text-sm text-muted-foreground">x.com/notcleverhandle</p>
                    </div>
                  </a>
                </CardContent>
              </Card>

              {/* Real-time Demo Note - Stays under Contact Info */}
              <Card className="bg-primary/5 border-primary/20 gap-3">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                    {t("contact.demo.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{t("contact.demo.description")}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
