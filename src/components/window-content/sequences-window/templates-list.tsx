/**
 * TEMPLATES LIST
 *
 * Displays and manages message templates for sequences.
 * Supports email, SMS, and WhatsApp templates.
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { TemplateEditor } from "./template-editor";
import {
  Search,
  Filter,
  Plus,
  Mail,
  MessageSquare,
  Smartphone,
  Loader2,
  Edit2,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  MoreVertical,
} from "lucide-react";

interface TemplatesListProps {
  organizationId: string;
  sessionId: string;
}

export function TemplatesList({ organizationId, sessionId }: TemplatesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newChannel, setNewChannel] = useState<"email" | "sms" | "whatsapp">("email");

  const templates = useQuery(api.sequences.templateOntology.listTemplates, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
    channel: channelFilter as "email" | "sms" | "whatsapp" | undefined,
    status: statusFilter,
  });

  const deleteTemplate = useMutation(api.sequences.templateOntology.deleteTemplate);
  const duplicateTemplate = useMutation(api.sequences.templateOntology.duplicateTemplate);
  const activateTemplate = useMutation(api.sequences.templateOntology.activateTemplate);
  const archiveTemplate = useMutation(api.sequences.templateOntology.archiveTemplate);

  const filteredTemplates =
    templates?.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "whatsapp":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "email":
        return "var(--win95-highlight)";
      case "sms":
        return "var(--success)";
      case "whatsapp":
        return "#25D366";
      default:
        return "var(--win95-highlight)";
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteTemplate({ sessionId, templateId: templateId as Id<"objects"> });
    } catch (error) {
      console.error("Failed to delete template:", error);
      alert(error instanceof Error ? error.message : "Failed to delete template");
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      await duplicateTemplate({ sessionId, templateId: templateId as Id<"objects"> });
    } catch (error) {
      console.error("Failed to duplicate template:", error);
    }
  };

  const handleActivate = async (templateId: string) => {
    try {
      await activateTemplate({ sessionId, templateId: templateId as Id<"objects"> });
    } catch (error) {
      console.error("Failed to activate template:", error);
      alert(error instanceof Error ? error.message : "Failed to activate template");
    }
  };

  const handleArchive = async (templateId: string) => {
    try {
      await archiveTemplate({ sessionId, templateId: templateId as Id<"objects"> });
    } catch (error) {
      console.error("Failed to archive template:", error);
    }
  };

  // Show editor if creating or editing
  if (isCreating || editingTemplateId) {
    return (
      <TemplateEditor
        sessionId={sessionId}
        organizationId={organizationId}
        templateId={editingTemplateId}
        defaultChannel={newChannel}
        onBack={() => {
          setIsCreating(false);
          setEditingTemplateId(null);
        }}
        onSaveSuccess={() => {
          setIsCreating(false);
          setEditingTemplateId(null);
        }}
      />
    );
  }

  if (templates === undefined) {
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Message Templates ({templates.length})
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value as "email" | "sms" | "whatsapp")}
              className="retro-input py-1 pl-2 pr-6 text-xs"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <button
              onClick={() => setIsCreating(true)}
              className="retro-button flex items-center gap-1 px-3 py-1 text-xs font-bold"
            >
              <Plus className="h-3 w-3" />
              New Template
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2"
              style={{ color: "var(--neutral-gray)" }}
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="retro-input w-full py-1 pl-7 pr-2 text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3" style={{ color: "var(--neutral-gray)" }} />
            <select
              value={channelFilter || "all"}
              onChange={(e) =>
                setChannelFilter(e.target.value === "all" ? undefined : e.target.value)
              }
              className="retro-input py-1 pl-2 pr-6 text-xs"
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <select
            value={statusFilter || "all"}
            onChange={(e) =>
              setStatusFilter(e.target.value === "all" ? undefined : e.target.value)
            }
            className="retro-input py-1 pl-2 pr-6 text-xs"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Mail
                className="mx-auto h-16 w-16 mb-3"
                style={{ color: "var(--neutral-gray)", opacity: 0.3 }}
              />
              <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                {templates.length === 0
                  ? "No templates yet. Create your first template."
                  : "No templates match your filters."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template._id}
                template={template}
                onEdit={() => setEditingTemplateId(template._id)}
                onDuplicate={() => handleDuplicate(template._id)}
                onActivate={() => handleActivate(template._id)}
                onArchive={() => handleArchive(template._id)}
                onDelete={() => handleDelete(template._id)}
                getChannelIcon={getChannelIcon}
                getChannelColor={getChannelColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: {
    _id: string;
    name: string;
    status: string;
    subtype?: string;
    description?: string;
    customProperties?: {
      category?: string;
      language?: string;
      subject?: string;
      body?: string;
    };
  };
  onEdit: () => void;
  onDuplicate: () => void;
  onActivate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  getChannelIcon: (channel: string) => React.ReactNode;
  getChannelColor: (channel: string) => string;
}

function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onActivate,
  onArchive,
  onDelete,
  getChannelIcon,
  getChannelColor,
}: TemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const channel = template.subtype || "email";
  const props = template.customProperties;

  return (
    <div
      className="group border-2 p-3"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2">
          <div
            className="p-1 border"
            style={{ borderColor: "var(--win95-border)", color: getChannelColor(channel) }}
          >
            {getChannelIcon(channel)}
          </div>
          <div>
            <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              {template.name}
            </h4>
            <p className="text-[10px] capitalize" style={{ color: "var(--neutral-gray)" }}>
              {channel} • {props?.category || "custom"}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="retro-button p-1 opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="h-3 w-3" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-8 z-20 w-36 border-2 py-1 shadow-lg"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <button
                  onClick={() => {
                    onEdit();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  style={{ color: "var(--win95-text)" }}
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDuplicate();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  style={{ color: "var(--win95-text)" }}
                >
                  <Copy className="h-3 w-3" />
                  Duplicate
                </button>
                {template.status === "draft" && (
                  <button
                    onClick={() => {
                      onActivate();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                    style={{ color: "var(--success)" }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Activate
                  </button>
                )}
                {template.status === "active" && (
                  <button
                    onClick={() => {
                      onArchive();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                    style={{ color: "var(--warning)" }}
                  >
                    <Clock className="h-3 w-3" />
                    Archive
                  </button>
                )}
                <div className="my-1 border-t" style={{ borderColor: "var(--win95-border)" }} />
                <button
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  style={{ color: "var(--error)" }}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subject (email only) */}
      {channel === "email" && props?.subject && (
        <p
          className="text-xs mb-2 truncate"
          style={{ color: "var(--win95-text)" }}
          title={props.subject}
        >
          Subject: {props.subject}
        </p>
      )}

      {/* Body preview */}
      {props?.body && (
        <p
          className="text-[10px] line-clamp-2 mb-3"
          style={{ color: "var(--neutral-gray)" }}
        >
          {props.body}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div
          className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold"
          style={{
            borderColor: "var(--win95-border)",
            background: template.status === "active" ? "var(--success)" : "var(--warning)",
            color: template.status === "active" ? "white" : "var(--win95-text)",
          }}
        >
          {template.status === "active" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          {template.status}
        </div>

        <button
          onClick={onEdit}
          className="text-xs font-bold hover:underline"
          style={{ color: "var(--win95-highlight)" }}
        >
          Edit →
        </button>
      </div>
    </div>
  );
}
