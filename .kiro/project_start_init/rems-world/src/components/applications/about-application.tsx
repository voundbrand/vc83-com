"use client";

import React, { useState, useEffect } from "react";
import { PageComponentProps } from "@/window-registry";
import {
  ApplicationLanguageProvider,
  useApplicationLanguage,
} from "@/contexts/application-language-context";
import enTranslations from "@/translations/about/en.json";
import deTranslations from "@/translations/about/de.json";

// Resume Content Component with Translations
function ResumeContentWithTranslations() {
  const { t } = useApplicationLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const experienceJobs = t("resume.experience.jobs") as any;

  return (
    <div className="space-y-6">
      {/* Short Version Summary */}
      <div className="border border-window-border bg-window-header p-4">
        <h3 className="font-semibold text-accent mb-2">{t("resume.shortVersion.title")}</h3>
        <p className="text-sm text-secondary whitespace-pre-wrap">
          {t("resume.shortVersion.description")}
        </p>
      </div>

      {/* Experience */}
      <div className="border border-window-border p-4">
        <h3 className="font-semibold text-accent mb-4">{t("resume.experience.title")}</h3>
        <div className="space-y-6">
          {/* Vound Brand */}
          <div className="border-l-2 border-accent pl-4">
            <h4 className="font-semibold">{experienceJobs.voundBrand.title}</h4>
            <p className="text-sm text-secondary">
              {experienceJobs.voundBrand.company} • {experienceJobs.voundBrand.duration}
            </p>
            <p className="text-sm text-secondary mt-1">{experienceJobs.voundBrand.description}</p>

            <div className="mt-3">
              <p className="text-xs font-semibold text-primary mb-2">
                {t("resume.experience.achievements")}:
              </p>
              <ul className="list-disc list-inside text-sm text-secondary space-y-1">
                {Array.isArray(experienceJobs.voundBrand.results) &&
                  experienceJobs.voundBrand.results.map((result: string, index: number) => (
                    <li key={index}>{result}</li>
                  ))}
              </ul>
            </div>
          </div>

          {/* Neue Apotheke */}
          <div className="border-l-2 border-accent pl-4">
            <h4 className="font-semibold">{experienceJobs.apotheke.title}</h4>
            <p className="text-sm text-secondary">
              {experienceJobs.apotheke.company} • {experienceJobs.apotheke.duration}
            </p>
            <p className="text-sm text-secondary mt-1">{experienceJobs.apotheke.description}</p>
            <ul className="list-disc list-inside text-sm text-secondary mt-2 space-y-1">
              {Array.isArray(experienceJobs.apotheke.responsibilities) &&
                experienceJobs.apotheke.responsibilities.map((resp: string, index: number) => (
                  <li key={index}>{resp}</li>
                ))}
            </ul>
          </div>

          {/* Northbit */}
          <div className="border-l-2 border-accent pl-4">
            <h4 className="font-semibold">{experienceJobs.northbit.title}</h4>
            <p className="text-sm text-secondary">
              {experienceJobs.northbit.company} • {experienceJobs.northbit.duration}
            </p>
            <p className="text-sm text-secondary mt-1">{experienceJobs.northbit.description}</p>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="border border-window-border p-4">
        <h3 className="font-semibold text-accent mb-4">{t("resume.skills.title")}</h3>
        <div className="space-y-4 text-sm">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {Object.entries(t("resume.skills.categories") as any).map(
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            ([key, category]: [string, any]) => (
              <div key={key}>
                <h4 className="font-semibold text-primary mb-2">{category.title}</h4>
                <p className="text-secondary">{category.items}</p>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Certifications */}
      <div className="border border-window-border p-4">
        <h3 className="font-semibold text-accent mb-2">{t("resume.certifications.title")}</h3>
        <ul className="list-disc list-inside text-sm text-secondary space-y-1">
          {Array.isArray(t("resume.certifications.items")) &&
            t("resume.certifications.items").map((cert: string, index: number) => (
              <li key={index}>{cert}</li>
            ))}
        </ul>
      </div>

      {/* My Values */}
      <div className="border border-window-border p-4">
        <h3 className="font-semibold text-accent mb-2">{t("resume.myValues.title")}</h3>
        <p className="text-sm text-secondary mb-3">{t("resume.myValues.intro")}</p>
        <div className="space-y-3">
          {Array.isArray(t("resume.myValues.reasons")) &&
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            t("resume.myValues.reasons").map((reason: any, index: number) => (
              <div key={index}>
                <h4 className="font-semibold text-primary text-sm">{reason.title}</h4>
                <p className="text-sm text-secondary">{reason.content}</p>
              </div>
            ))}
        </div>
        <p className="text-sm text-secondary mt-4">{t("resume.myValues.closing")}</p>
      </div>

      {/* Download Button */}
      <div className="text-center">
        <button className="btn btn-primary">{t("resume.download")}</button>
      </div>
    </div>
  );
}

// Language Switcher Component
function LanguageSwitcher() {
  const { language, setLanguage } = useApplicationLanguage();

  return (
    <div className="flex gap-1 p-2 bg-window-bg">
      <button
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 text-xs ${
          language === "en"
            ? "bg-accent text-dark font-bold"
            : "bg-window-header text-secondary hover:text-primary"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("de")}
        className={`px-2 py-1 text-xs ${
          language === "de"
            ? "bg-accent text-dark font-bold"
            : "bg-window-header text-secondary hover:text-primary"
        }`}
      >
        DE
      </button>
    </div>
  );
}

// Inner About Application Component that uses translations
function AboutApplicationContent() {
  const [activeTab, setActiveTab] = useState("bio");
  const { t, language } = useApplicationLanguage();

  // Update ProfileCard to use translations
  const ProfileCardWithTranslations = () => {
    return (
      <div className="border border-window-border bg-window-header p-4 space-y-4">
        {/* Avatar */}
        <div className="aspect-square bg-gradient-to-br from-[var(--bg-accent)] to-[var(--system-purple-dark)] flex items-center justify-center text-4xl font-bold text-[var(--text-inverse)]">
          RS
        </div>

        {/* Name and Title */}
        <div className="text-center">
          <h3 className="font-bold text-lg">{t("bio.profile.name")}</h3>
          <p className="text-sm text-secondary">{t("bio.profile.title")}</p>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary">{t("bio.details.location")}:</span>
            <span>{t("bio.profile.location")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">{t("bio.details.languages")}:</span>
            <span>{language === "en" ? "EN, DE" : "DE, EN"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">{t("bio.details.joined")}</span>
            <span>{t("bio.details.joinedValue")}</span>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-2">
          <button className="w-full btn btn-secondary text-xs">{t("bio.links.github")}</button>
          <button className="w-full btn btn-secondary text-xs">{t("bio.links.linkedin")}</button>
          <button className="w-full btn btn-secondary text-xs">{t("bio.links.twitter")}</button>
        </div>
      </div>
    );
  };

  // Update tab labels to use translations
  const tabs = [
    { id: "bio", label: t("bio.tabs.bio") },
    { id: "readme", label: t("bio.tabs.readme") },
    { id: "resume", label: t("resume.title") },
  ];

  return (
    <div className="relative">
      {/* Language Switcher */}
      <div className="absolute top-0 right-0 z-10">
        <LanguageSwitcher />
      </div>

      {/* Main content container */}
      <div className="pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <ProfileCardWithTranslations />
          </div>

          {/* Right Column - Tabbed Content */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="flex border-b border-window-border bg-window-header">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-window-bg text-primary border-l border-r border-t border-window-border -mb-px"
                      : "text-secondary hover:text-primary hover:bg-window-bg/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="border border-window-border border-t-0 bg-window-bg p-6">
              {activeTab === "bio" && (
                <div className="space-y-4 text-sm">
                  <div className="whitespace-pre-wrap">{t("bio.content.bio")}</div>

                  <h4 className="font-semibold text-accent mt-6">{t("bio.achievements.title")}</h4>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    {Array.isArray(t("bio.achievements.items")) &&
                      t("bio.achievements.items").map((item: string, index: number) => (
                        <li key={index}>{item}</li>
                      ))}
                  </ul>
                </div>
              )}

              {activeTab === "readme" && (
                <div className="space-y-4 text-sm">
                  <div className="whitespace-pre-wrap mb-6">{t("bio.content.readme.intro")}</div>

                  <div>
                    <h5 className="font-semibold text-primary mb-2">
                      {t("bio.content.readme.responsibilities.title")}
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-secondary">
                      {Array.isArray(t("bio.content.readme.responsibilities.items")) &&
                        t("bio.content.readme.responsibilities.items").map(
                          (item: string, index: number) => <li key={index}>{item}</li>,
                        )}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-primary mb-2">
                      {t("bio.content.readme.quirks.title")}
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-secondary">
                      {Array.isArray(t("bio.content.readme.quirks.items")) &&
                        t("bio.content.readme.quirks.items").map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-primary mb-2">
                      {t("bio.content.readme.values.title")}
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-secondary">
                      {Array.isArray(t("bio.content.readme.values.items")) &&
                        t("bio.content.readme.values.items").map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-primary mb-2">
                      {t("bio.content.readme.help.title")}
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-secondary">
                      {Array.isArray(t("bio.content.readme.help.items")) &&
                        t("bio.content.readme.help.items").map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-primary mb-2">
                      {t("bio.content.readme.helpMe.title")}
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-secondary">
                      {Array.isArray(t("bio.content.readme.helpMe.items")) &&
                        t("bio.content.readme.helpMe.items").map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-primary mb-2">
                      {t("bio.content.readme.personal.title")}
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-secondary">
                      {Array.isArray(t("bio.content.readme.personal.items")) &&
                        t("bio.content.readme.personal.items").map(
                          (item: string, index: number) => <li key={index}>{item}</li>,
                        )}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "resume" && <ResumeContentWithTranslations />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main About Application Component with Language Provider
export function AboutApplication({}: PageComponentProps) {
  const [savedLanguage, setSavedLanguage] = useState("en");

  useEffect(() => {
    // Load saved language from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app-language");
      if (saved && (saved === "en" || saved === "de")) {
        setSavedLanguage(saved);
      }
    }
  }, []);

  return (
    <ApplicationLanguageProvider
      translations={{ en: enTranslations, de: deTranslations }}
      defaultLanguage={savedLanguage}
    >
      <AboutApplicationContent />
    </ApplicationLanguageProvider>
  );
}
