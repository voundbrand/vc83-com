/**
 * TEMPLATE EDITOR
 *
 * Editor for creating and editing message templates.
 * Supports email, SMS, and WhatsApp with variable placeholders.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  MessageSquare,
  Smartphone,
  Eye,
  Code,
} from "lucide-react";

interface TemplateEditorProps {
  sessionId: string;
  organizationId: string;
  templateId: string | null;
  defaultChannel: "email" | "sms" | "whatsapp";
  onBack: () => void;
  onSaveSuccess: () => void;
}

export function TemplateEditor({
  sessionId,
  organizationId,
  templateId,
  defaultChannel,
  onBack,
  onSaveSuccess,
}: TemplateEditorProps) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "whatsapp">(defaultChannel);
  const [category, setCategory] = useState("custom");
  const [language, setLanguage] = useState("de");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const template = useQuery(
    api.sequences.templateOntology.getTemplate,
    templateId ? { sessionId, templateId: templateId as Id<"objects"> } : "skip"
  );

  const preview = useQuery(
    api.sequences.templateOntology.previewTemplate,
    templateId ? { sessionId, templateId: templateId as Id<"objects"> } : "skip"
  );

  const createTemplate = useMutation(api.sequences.templateOntology.createTemplate);
  const updateTemplate = useMutation(api.sequences.templateOntology.updateTemplate);

  // Load template data when editing
  useEffect(() => {
    if (template) {
      setName(template.name);
      setChannel((template.subtype as "email" | "sms" | "whatsapp") || "email");
      const props = template.customProperties as Record<string, unknown>;
      setCategory((props?.category as string) || "custom");
      setLanguage((props?.language as string) || "de");
      setSubject((props?.subject as string) || "");
      setBody((props?.body as string) || "");
      setBodyHtml((props?.bodyHtml as string) || "");
    }
  }, [template]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a template name");
      return;
    }
    if (!body.trim()) {
      alert("Please enter template content");
      return;
    }
    if (channel === "email" && !subject.trim()) {
      alert("Please enter an email subject");
      return;
    }

    setIsSaving(true);
    try {
      if (templateId) {
        await updateTemplate({
          sessionId,
          templateId: templateId as Id<"objects">,
          updates: {
            name,
            category: category as
              | "reminder"
              | "confirmation"
              | "followup"
              | "upsell"
              | "review"
              | "certificate"
              | "checkin"
              | "custom",
            language,
            subject: channel === "email" ? subject : undefined,
            body,
            bodyHtml: channel === "email" ? bodyHtml : undefined,
          },
        });
      } else {
        await createTemplate({
          sessionId,
          organizationId: organizationId as Id<"organizations">,
          name,
          channel,
          category: category as
            | "reminder"
            | "confirmation"
            | "followup"
            | "upsell"
            | "review"
            | "certificate"
            | "checkin"
            | "custom",
          language,
          subject: channel === "email" ? subject : undefined,
          body,
          bodyHtml: channel === "email" ? bodyHtml : undefined,
        });
      }
      onSaveSuccess();
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("template-body") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.slice(0, start) + `{{${variable}}}` + body.slice(end);
      setBody(newBody);
      // Reset cursor position after state update
      setTimeout(() => {
        textarea.focus();
        const newPos = start + variable.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const availableVariables = [
    { name: "firstName", label: "First Name" },
    { name: "lastName", label: "Last Name" },
    { name: "email", label: "Email" },
    { name: "eventName", label: "Event Name" },
    { name: "eventDate", label: "Event Date" },
    { name: "eventTime", label: "Event Time" },
    { name: "locationName", label: "Location" },
    { name: "daysUntil", label: "Days Until" },
    { name: "daysAgo", label: "Days Ago" },
    { name: "bookingRef", label: "Booking Ref" },
    { name: "companyName", label: "Company" },
  ];

  if (templateId && template === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="border-b-2 p-3"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="retro-button p-1" title="Back">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              {templateId ? "Edit Template" : "New Template"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`retro-button flex items-center gap-1 px-3 py-1 text-xs font-bold ${
                showPreview ? "ring-2" : ""
              }`}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="retro-button flex items-center gap-1 px-3 py-1 text-xs font-bold"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Form Panel */}
        <div
          className={`${showPreview ? "w-1/2" : "w-full"} border-r-2 overflow-auto p-4`}
          style={{ borderColor: "var(--win95-border)" }}
        >
          <div className="space-y-4 max-w-2xl">
            {/* Name */}
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: "var(--win95-text)" }}>
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Booking Confirmation Email"
                className="retro-input w-full py-1 px-2 text-sm"
              />
            </div>

            {/* Channel (only for new templates) */}
            {!templateId && (
              <div>
                <label
                  className="text-xs font-bold mb-1 block"
                  style={{ color: "var(--win95-text)" }}
                >
                  Channel
                </label>
                <div className="flex gap-2">
                  {(["email", "sms", "whatsapp"] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`retro-button flex items-center gap-1 px-3 py-1 text-xs ${
                        channel === ch ? "ring-2" : ""
                      }`}
                    >
                      {ch === "email" && <Mail className="h-3 w-3" />}
                      {ch === "sms" && <MessageSquare className="h-3 w-3" />}
                      {ch === "whatsapp" && <Smartphone className="h-3 w-3" />}
                      <span className="capitalize">{ch}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="text-xs font-bold mb-1 block"
                  style={{ color: "var(--win95-text)" }}
                >
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="retro-input w-full py-1 pl-2 pr-6 text-xs"
                >
                  <option value="reminder">Reminder</option>
                  <option value="confirmation">Confirmation</option>
                  <option value="followup">Follow-up</option>
                  <option value="upsell">Upsell</option>
                  <option value="review">Review Request</option>
                  <option value="certificate">Certificate</option>
                  <option value="checkin">Check-in</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label
                  className="text-xs font-bold mb-1 block"
                  style={{ color: "var(--win95-text)" }}
                >
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="retro-input w-full py-1 pl-2 pr-6 text-xs"
                >
                  <option value="de">German (de)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
            </div>

            {/* Subject (email only) */}
            {channel === "email" && (
              <div>
                <label
                  className="text-xs font-bold mb-1 block"
                  style={{ color: "var(--win95-text)" }}
                >
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Deine Buchung bei {{companyName}}"
                  className="retro-input w-full py-1 px-2 text-sm"
                />
              </div>
            )}

            {/* Variables */}
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: "var(--win95-text)" }}>
                <Code className="h-3 w-3 inline mr-1" />
                Insert Variable
              </label>
              <div className="flex flex-wrap gap-1">
                {availableVariables.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => insertVariable(v.name)}
                    className="retro-button px-2 py-0.5 text-[10px]"
                    title={`Insert {{${v.name}}}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: "var(--win95-text)" }}>
                Message Content
              </label>
              <textarea
                id="template-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Enter your ${channel} message here...\n\nUse {{variableName}} for dynamic content.`}
                className="retro-input w-full py-2 px-2 text-sm font-mono"
                rows={channel === "sms" ? 4 : 10}
                maxLength={channel === "sms" ? 160 : undefined}
              />
              {channel === "sms" && (
                <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {body.length}/160 characters
                </p>
              )}
            </div>

            {/* HTML Body (email only) */}
            {channel === "email" && (
              <div>
                <label
                  className="text-xs font-bold mb-1 block"
                  style={{ color: "var(--win95-text)" }}
                >
                  HTML Body (Optional)
                </label>
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="Enter HTML version for rich email..."
                  className="retro-input w-full py-2 px-2 text-xs font-mono"
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 overflow-auto p-4" style={{ background: "var(--win95-bg)" }}>
            <h4 className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
              Preview (with sample data)
            </h4>

            {preview ? (
              <div
                className="border-2 p-4"
                style={{ borderColor: "var(--win95-border)", background: "white" }}
              >
                {channel === "email" && preview.rendered.subject && (
                  <div className="mb-3 pb-3 border-b" style={{ borderColor: "var(--win95-border)" }}>
                    <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      Subject:
                    </p>
                    <p className="text-sm font-bold">{preview.rendered.subject}</p>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap">{preview.rendered.body}</div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed p-4 text-center"
                style={{ borderColor: "var(--win95-border)" }}
              >
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Save the template to see preview with sample data
                </p>
              </div>
            )}

            {/* Sample Data */}
            {preview?.usedData && (
              <div className="mt-4">
                <h5 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Sample Data Used:
                </h5>
                <div
                  className="border p-2 text-[10px] font-mono"
                  style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
                >
                  {Object.entries(preview.usedData).map(([key, value]) => (
                    <div key={key}>
                      <span style={{ color: "var(--win95-highlight)" }}>{key}</span>: {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
