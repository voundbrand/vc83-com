"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Mail, Phone, MapPin, Globe, Briefcase } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import ReactCountryFlag from "react-country-flag";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function Resume() {
  const { t } = useLanguage();
  const resumeUrl = useQuery(api.storage.getUrl, { storageId: "kg2fqt3r7yjd84fppsa3m46mgs7qcb01" });

  const handleDownload = () => {
    if (resumeUrl) {
      // Open PDF in a new window/tab
      window.open(resumeUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section id="resume" className="py-20 bg-background relative">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-transparent to-muted/20"></div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">REMINGTON SPLETTSTOESSER</h1>
            <p className="text-xl text-muted-foreground mb-6">{t("resume.subtitle")}</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                remington@voundbrand.com
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                +49 0151 404 27 103
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Pasewalk, Germany (1.5h outside of Berlin)
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <ReactCountryFlag
                    countryCode="US"
                    svg
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span className="text-sm">Native English</span>
                  <span className="text-sm mx-1">|</span>
                  <ReactCountryFlag
                    countryCode="DE"
                    svg
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span className="text-sm">Fluent German</span>
                  <span className="text-sm mx-1">|</span>
                  <ReactCountryFlag
                    countryCode="EU"
                    svg
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span className="text-sm">EU Work Authorization</span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleDownload}
              className="bg-primary hover:bg-primary/90"
              disabled={!resumeUrl}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("resume.download")}
            </Button>
          </div>

          {/* Short Version */}
          <Card className="mb-8 shadow-sm hover:shadow-md transition-shadow duration-300 bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">{t("resume.shortVersion.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {t("resume.shortVersion.description")}
              </p>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card className="mb-8 shadow-sm hover:shadow-md transition-shadow duration-300 bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {t("resume.experience.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Vound Brand */}
              <div className="border-l-2 border-primary/20 pl-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">
                      {t("resume.experience.jobs.voundBrand.title")}
                    </h3>
                    <p className="text-primary font-medium">
                      {t("resume.experience.jobs.voundBrand.company")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="mt-2 lg:mt-0">
                    {t("resume.experience.jobs.voundBrand.duration")}
                  </Badge>
                </div>
                <p className="text-muted-foreground italic mb-3">
                  {t("resume.experience.jobs.voundBrand.description")}
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Results:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {t("resume.experience.jobs.voundBrand.results").map(
                        (result: string, idx: number) => (
                          <li key={idx}>• {result}</li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Responsibilities:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {t("resume.experience.jobs.voundBrand.responsibilities").map(
                        (resp: string, idx: number) => (
                          <li key={idx}>• {resp}</li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>

                <p className="text-sm italic text-muted-foreground mt-3">
                  {t("resume.experience.jobs.voundBrand.learning")}
                </p>
              </div>

              {/* Neue Apotheke */}
              <div className="border-l-2 border-primary/20 pl-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">
                      {t("resume.experience.jobs.apotheke.title")}
                    </h3>
                    <p className="text-primary font-medium">
                      {t("resume.experience.jobs.apotheke.company")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="mt-2 lg:mt-0">
                    {t("resume.experience.jobs.apotheke.duration")}
                  </Badge>
                </div>
                <p className="text-muted-foreground italic mb-3">
                  {t("resume.experience.jobs.apotheke.description")}
                </p>

                <ul className="text-sm text-muted-foreground space-y-1">
                  {t("resume.experience.jobs.apotheke.responsibilities").map(
                    (resp: string, idx: number) => (
                      <li key={idx}>• {resp}</li>
                    ),
                  )}
                </ul>

                <p className="text-sm italic text-muted-foreground mt-3">
                  {t("resume.experience.jobs.apotheke.learning")}
                </p>
              </div>

              {/* Northbit */}
              <div className="border-l-2 border-primary/20 pl-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">
                      {t("resume.experience.jobs.northbit.title")}
                    </h3>
                    <p className="text-primary font-medium">
                      {t("resume.experience.jobs.northbit.company")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="mt-2 lg:mt-0">
                    {t("resume.experience.jobs.northbit.duration")}
                  </Badge>
                </div>
                <p className="text-muted-foreground italic mb-3">
                  {t("resume.experience.jobs.northbit.description")}
                </p>

                <ul className="text-sm text-muted-foreground space-y-1">
                  {t("resume.experience.jobs.northbit.responsibilities").map(
                    (resp: string, idx: number) => (
                      <li key={idx}>• {resp}</li>
                    ),
                  )}
                </ul>

                <p className="text-sm italic text-muted-foreground mt-3">
                  {t("resume.experience.jobs.northbit.learning")}
                </p>
              </div>

              {/* EMC */}
              <div className="border-l-2 border-primary/20 pl-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{t("resume.experience.jobs.emc.title")}</h3>
                    <p className="text-primary font-medium">
                      {t("resume.experience.jobs.emc.company")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="mt-2 lg:mt-0">
                    {t("resume.experience.jobs.emc.duration")}
                  </Badge>
                </div>
                <p className="text-muted-foreground italic mb-3">
                  {t("resume.experience.jobs.emc.description")}
                </p>

                <ul className="text-sm text-muted-foreground space-y-1">
                  {t("resume.experience.jobs.emc.responsibilities").map(
                    (resp: string, idx: number) => (
                      <li key={idx}>• {resp}</li>
                    ),
                  )}
                </ul>

                <p className="text-sm italic text-muted-foreground mt-3">
                  {t("resume.experience.jobs.emc.learning")}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Technical Foundation - Left Column */}
            <div className="lg:col-span-2">
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-2xl">{t("resume.skills.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(t("resume.skills.categories")).map(
                      ([key, category]: [string, any]) => (
                        <div key={key}>
                          <h4 className="font-semibold mb-2">{category.title}:</h4>
                          <p className="text-sm text-muted-foreground">{category.items}</p>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Certifications & Education */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>{t("resume.certifications.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {t("resume.certifications.items").map((cert: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
