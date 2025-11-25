"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Eye, FileText, ClipboardCheck, FileQuestion, Users } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Loader2 } from "lucide-react";

/**
 * Templates Tab - Form Templates
 *
 * Displays available form templates that can be used to create new forms.
 * Shows templates enabled for the current organization.
 */

type TemplateId = "haffsymposium-registration" | "conference-feedback-survey" | "speaker-proposal" | "volunteer-application";

interface Template {
  id: TemplateId;
  nameKey: string;
  descriptionKey: string;
  useCaseKey: string;
  colorVar: string;
  icon: React.ReactNode;
  featureKeys: string[];
  available?: boolean;
}

const getTemplates = (): Template[] => [
  {
    id: "haffsymposium-registration",
    nameKey: "ui.forms.templates.haffsymposium_registration.name",
    descriptionKey: "ui.forms.templates.haffsymposium_registration.description",
    useCaseKey: "ui.forms.templates.haffsymposium_registration.use_case",
    colorVar: "var(--win95-highlight)",
    icon: <FileText size={24} />,
    featureKeys: [
      "ui.forms.templates.haffsymposium_registration.features.categories",
      "ui.forms.templates.haffsymposium_registration.features.pricing",
      "ui.forms.templates.haffsymposium_registration.features.personal_info",
      "ui.forms.templates.haffsymposium_registration.features.special_requests",
      "ui.forms.templates.haffsymposium_registration.features.ucra_addon",
    ],
  },
  {
    id: "conference-feedback-survey",
    nameKey: "ui.forms.templates.conference_feedback_survey.name",
    descriptionKey: "ui.forms.templates.conference_feedback_survey.description",
    useCaseKey: "ui.forms.templates.conference_feedback_survey.use_case",
    colorVar: "var(--success)",
    icon: <ClipboardCheck size={24} />,
    featureKeys: [
      "ui.forms.templates.conference_feedback_survey.features.nps",
      "ui.forms.templates.conference_feedback_survey.features.ratings",
      "ui.forms.templates.conference_feedback_survey.features.content",
      "ui.forms.templates.conference_feedback_survey.features.venue",
      "ui.forms.templates.conference_feedback_survey.features.future_topics",
    ],
  },
  {
    id: "speaker-proposal",
    nameKey: "ui.forms.templates.speaker_proposal.name",
    descriptionKey: "ui.forms.templates.speaker_proposal.description",
    useCaseKey: "ui.forms.templates.speaker_proposal.use_case",
    colorVar: "var(--win95-highlight)",
    icon: <FileQuestion size={24} />,
    featureKeys: [
      "ui.forms.templates.speaker_proposal.features.bio",
      "ui.forms.templates.speaker_proposal.features.topic",
      "ui.forms.templates.speaker_proposal.features.abstract",
      "ui.forms.templates.speaker_proposal.features.requirements",
      "ui.forms.templates.speaker_proposal.features.availability",
    ],
  },
  {
    id: "volunteer-application",
    nameKey: "ui.forms.templates.volunteer_application.name",
    descriptionKey: "ui.forms.templates.volunteer_application.description",
    useCaseKey: "ui.forms.templates.volunteer_application.use_case",
    colorVar: "var(--success)",
    icon: <Users size={24} />,
    featureKeys: [
      "ui.forms.templates.volunteer_application.features.personal",
      "ui.forms.templates.volunteer_application.features.availability",
      "ui.forms.templates.volunteer_application.features.skills",
      "ui.forms.templates.volunteer_application.features.experience",
      "ui.forms.templates.volunteer_application.features.references",
    ],
  },
];

interface TemplatesTabProps {
  onUseTemplate: (templateCode: string) => void;
}

export function TemplatesTab({ onUseTemplate }: TemplatesTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.forms");

  // Fetch available form templates for this organization
  const availableTemplates = useQuery(
    api.formTemplateAvailability.getAvailableFormTemplates,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  if (translationsLoading || availableTemplates === undefined) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  const templates = getTemplates();

  // Map available templates to template IDs
  const availableTemplateCodes = availableTemplates.map(
    (t) => t.customProperties?.code as string
  );

  // Mark templates as available or not
  const templatesWithAvailability = templates.map((template) => ({
    ...template,
    available: availableTemplateCodes.includes(template.id),
  }));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.forms.templates.title")}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.forms.templates.description")}
        </p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templatesWithAvailability.map((template) => (
          <div
            key={template.id}
            className={`border-2 rounded-lg p-4 transition-shadow ${
              template.available ? "hover:shadow-md" : "opacity-60"
            }`}
            style={{
              background: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
            }}
          >
            {/* Template Header */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="p-2 rounded border-2"
                style={{
                  backgroundColor: "var(--win95-bg)",
                  color: template.colorVar,
                  borderColor: template.colorVar,
                }}
              >
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t(template.nameKey)}
                </h4>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  {t(template.descriptionKey)}
                </p>
              </div>
            </div>

            {/* Use Case Badge */}
            <div
              className="inline-block px-2 py-1 text-[10px] font-bold rounded border mb-3"
              style={{
                backgroundColor: "var(--win95-bg)",
                color: template.colorVar,
                borderColor: template.colorVar,
              }}
            >
              {t(template.useCaseKey)}
            </div>

            {/* Availability Badge */}
            {!template.available && (
              <div
                className="inline-block px-2 py-1 text-[10px] font-bold rounded border mb-3 ml-2"
                style={{
                  backgroundColor: "var(--win95-bg)",
                  color: "var(--neutral-gray)",
                  borderColor: "var(--neutral-gray)",
                }}
              >
                {t("ui.forms.templates.not_available")}
              </div>
            )}

            {/* Features */}
            <div className="space-y-1 mb-4">
              {template.featureKeys.map((featureKey, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <span className="text-[10px] mt-0.5">✓</span>
                  <span>{t(featureKey)}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onUseTemplate(template.id)}
                disabled={!template.available}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-opacity border-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: template.available ? template.colorVar : "var(--win95-bg)",
                  color: template.available ? "var(--win95-titlebar-text)" : "var(--neutral-gray)",
                  borderColor: template.available ? template.colorVar : "var(--win95-border)",
                }}
              >
                <FileText size={14} />
                {t("ui.forms.templates.buttons.use")}
              </button>
              <button
                disabled
                className="px-3 py-2 text-xs font-semibold rounded opacity-50 cursor-not-allowed"
                style={{
                  backgroundColor: "var(--win95-bg)",
                  color: "var(--win95-text)",
                  border: "2px solid var(--win95-border)",
                }}
                title={t("ui.forms.templates.buttons.preview_hint")}
              >
                <Eye size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div
        className="mt-6 p-4 border-2 rounded"
        style={{
          backgroundColor: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          💡 {t("ui.forms.templates.usage.title")}
        </h4>
        <div className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <p>• {t("ui.forms.templates.usage.registration")}</p>
          <p>• {t("ui.forms.templates.usage.survey")}</p>
          <p>• {t("ui.forms.templates.usage.application")}</p>
          <p>• {t("ui.forms.templates.usage.custom")}</p>
        </div>
      </div>
    </div>
  );
}
