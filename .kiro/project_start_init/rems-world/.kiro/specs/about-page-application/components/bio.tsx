"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Github, Linkedin, MapPin, Calendar, Pizza } from "lucide-react";
import { XIcon } from "@/components/icons/x-icon";
import { useLanguage } from "@/contexts/language-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ReactCountryFlag from "react-country-flag";
import { LocationMap } from "@/components/location-map";

export function Bio() {
  const { t } = useLanguage();
  const avatarUrl = useQuery(api.storage.getUrl, { storageId: "kg2crnjwqwhkm5qv3fyjnntmhh7qc2cc" });

  return (
    <section id="bio" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">{t("bio.title")}</h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              {t("bio.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 shadow-lg overflow-hidden p-0">
                {/* Profile Image - No CardContent wrapper for the image */}
                <div className="relative aspect-square">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={t("bio.profile.name")}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">RS</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <div className="inline-flex p-[3px] bg-white rounded-sm shadow-md">
                      <ReactCountryFlag
                        countryCode="DE"
                        svg
                        style={{
                          width: "24px",
                          height: "18px",
                          display: "block",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="p-6 text-center border-b bg-background">
                  <h3 className="font-bold text-xl mb-1">{t("bio.profile.name")}</h3>
                  <p className="text-muted-foreground text-sm font-medium">
                    {t("bio.profile.title")}
                  </p>
                </div>

                {/* Details Section */}
                <div className="p-6 border-b">
                  <h4 className="font-semibold text-sm mb-4 text-muted-foreground">
                    {t("bio.details.title")}
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bio.details.joined")}</span>
                      <span>{t("bio.details.joinedValue")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("bio.details.pineapple")}</span>
                      <span className="text-lg text-red-500">👎</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bio.details.location")}</span>
                      <span>{t("bio.profile.location")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("bio.details.languages")}</span>
                      <div className="flex items-center gap-1">
                        <ReactCountryFlag
                          countryCode="US"
                          svg
                          style={{ width: "14px", height: "14px" }}
                        />
                        <ReactCountryFlag
                          countryCode="DE"
                          svg
                          style={{ width: "14px", height: "14px" }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("bio.details.workAuth")}</span>
                      <div className="flex items-center gap-1">
                        <ReactCountryFlag
                          countryCode="EU"
                          svg
                          style={{ width: "14px", height: "14px" }}
                        />
                        <span className="text-xs">EU</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Links Section */}
                <div className="p-6 border-b">
                  <h4 className="font-semibold text-sm mb-4 text-muted-foreground">
                    {t("bio.links.title")}
                  </h4>
                  <div className="flex gap-2">
                    <a
                      href="https://github.com/voundbrand"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="p-2 hover:bg-muted">
                        <Github className="h-4 w-4" />
                      </Button>
                    </a>
                    <a
                      href="https://x.com/notcleverhandle"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="p-2 hover:bg-muted">
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </a>
                    <a
                      href="https://www.linkedin.com/in/therealremington"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="p-2 hover:bg-muted">
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Achievements Section */}
                <div className="p-6">
                  <h4 className="font-semibold text-sm mb-4 text-muted-foreground">
                    {t("bio.achievements.title")}
                  </h4>
                  <ul className="space-y-2">
                    {t("bio.achievements.items").map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-xs text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>

            {/* Right Column - Tabbed Content */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="bio" className="w-full gap-0">
                {/* Floating tabs */}
                <TabsList className="h-auto p-0 bg-transparent flex">
                  <TabsTrigger
                    value="bio"
                    className="relative z-10 -mb-px rounded-t-lg rounded-b-none data-[state=active]:bg-background data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-border data-[state=active]:border-b-2 data-[state=active]:border-b-background data-[state=active]:shadow-none px-6 py-3 mr-1 data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted/70 transition-all"
                  >
                    {t("bio.tabs.bio")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="readme"
                    className="relative z-10 -mb-px rounded-t-lg rounded-b-none data-[state=active]:bg-background data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-border data-[state=active]:border-b-2 data-[state=active]:border-b-background data-[state=active]:shadow-none px-6 py-3 data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted/70 transition-all"
                  >
                    {t("bio.tabs.readme")}
                  </TabsTrigger>
                </TabsList>

                {/* Content card */}
                <div className="relative bg-background border border-border rounded-b-lg rounded-tr-lg overflow-hidden">
                  <TabsContent value="bio" className="p-8 mt-0 min-h-[500px]">
                    <div className="prose prose-gray max-w-none">
                      <div className="text-muted-foreground leading-relaxed text-base">
                        {(() => {
                          const bioContent = t("bio.content.bio");
                          // Handle loading state
                          if (typeof bioContent !== "string") return null;

                          return bioContent.split("\n").map((paragraph: string, idx: number) => {
                            // Check if this paragraph contains the event management platform text in English or German
                            const eventPlatformTexts = [
                              "event management platform",
                              "Event-Management-Plattform",
                            ];
                            const matchedText = eventPlatformTexts.find((text) =>
                              paragraph.includes(text),
                            );

                            if (matchedText) {
                              const parts = paragraph.split(matchedText);
                              return (
                                <p key={idx} className="mb-4">
                                  {parts[0]}
                                  <a
                                    href="https://eventrrr.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {matchedText}
                                  </a>
                                  {parts[1]}
                                </p>
                              );
                            }
                            return (
                              <p key={idx} className="mb-4">
                                {paragraph}
                              </p>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="readme" className="p-8 mt-0 min-h-[500px]">
                    <div className="space-y-8">
                      {/* Intro */}
                      <div className="prose prose-gray max-w-none">
                        <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                          {t("bio.content.readme.intro")}
                        </div>
                      </div>

                      {/* Areas of Responsibility */}
                      <div>
                        <h3 className="text-xl font-semibold mb-4 text-foreground">
                          {t("bio.content.readme.responsibilities.title")}
                        </h3>
                        <ul className="space-y-3">
                          {t("bio.content.readme.responsibilities.items").map(
                            (item: string, idx: number) => (
                              <li
                                key={idx}
                                className="flex items-start gap-3 text-muted-foreground"
                              >
                                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-base">{item}</span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>

                      {/* Quirks */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          {t("bio.content.readme.quirks.title")}
                        </h3>
                        <ul className="space-y-3">
                          {t("bio.content.readme.quirks.items").map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* What I Value */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          {t("bio.content.readme.values.title")}
                        </h3>
                        <ul className="space-y-2">
                          {t("bio.content.readme.values.items").map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* How I Can Help You */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          {t("bio.content.readme.help.title")}
                        </h3>
                        <ul className="space-y-2">
                          {t("bio.content.readme.help.items").map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* How You Can Help Me */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          {t("bio.content.readme.helpMe.title")}
                        </h3>
                        <ul className="space-y-2">
                          {t("bio.content.readme.helpMe.items").map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Personal */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          {t("bio.content.readme.personal.title")}
                        </h3>
                        <ul className="space-y-2">
                          {t("bio.content.readme.personal.items").map(
                            (item: string, idx: number) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-muted-foreground"
                              >
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span>{item}</span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>

                      {/* Personal Strategy */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          {t("bio.content.readme.strategy.title")}
                        </h3>
                        <ul className="space-y-2 mb-4">
                          {t("bio.content.readme.strategy.items").map(
                            (item: string, idx: number) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-muted-foreground"
                              >
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span>{item}</span>
                              </li>
                            ),
                          )}
                        </ul>
                        <p className="text-muted-foreground italic leading-relaxed">
                          {t("bio.content.readme.strategy.footer")}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Location Map */}
              <LocationMap />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
