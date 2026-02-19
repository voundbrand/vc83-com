"use client";

/**
 * DOCS EDITOR PANEL
 *
 * A document editor panel for the builder that allows users to:
 * - Create and edit text documents (markdown)
 * - Save documents to the Files system
 * - Load existing documents as AI context
 * - Use templates (StoryBrand, general copy, etc.)
 *
 * Documents created here can be attached to v0 generation requests
 * to provide context for AI-generated pages.
 */

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  FileText,
  Save,
  FolderOpen,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  Check,
  X,
  Sparkles,
  BookOpen,
  Target,
  Users,
  Megaphone,
  FileCode,
} from "lucide-react";

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

interface DocumentTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  content: string;
}

const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "blank",
    name: "Blank Document",
    icon: <FileText className="w-4 h-4" />,
    description: "Start with a clean slate",
    content: "# Untitled Document\n\nStart writing here...",
  },
  {
    id: "storybrand",
    name: "StoryBrand BrandScript",
    icon: <BookOpen className="w-4 h-4" />,
    description: "Donald Miller's 7-part framework",
    content: `# StoryBrand BrandScript

## 1. A Character (Your Customer)
Who is your customer? What do they want as it relates to your brand?

**Customer Description:**
-

**What They Want:**
-

---

## 2. Has a Problem
What external, internal, and philosophical problems does your customer face?

**External Problem (tangible, surface-level):**
-

**Internal Problem (how it makes them feel):**
-

**Philosophical Problem (why it's wrong):**
-

**The Villain (root cause of problems):**
-

---

## 3. And Meets a Guide (Your Brand)
Position yourself as the guide, not the hero. Show empathy and authority.

**Empathy Statement:**
-

**Authority Credentials:**
-

---

## 4. Who Gives Them a Plan
What simple steps do customers need to take to do business with you?

**Step 1:**
-

**Step 2:**
-

**Step 3:**
-

---

## 5. And Calls Them to Action
What is your direct call to action? What is your transitional call to action?

**Direct CTA (buy now, schedule, sign up):**
-

**Transitional CTA (free resource, trial):**
-

---

## 6. That Helps Them Avoid Failure
What negative consequences will the customer experience if they don't buy?

**Failure Stakes:**
-

---

## 7. And Ends in Success
What does the customer's life look like after they engage with your brand?

**Success Outcomes:**
-

---

## One-Liner
Distill your brand message into a single, memorable sentence.

**Problem:**
**Solution:**
**Result:**

**One-Liner:** ""
`,
  },
  {
    id: "landing-page-copy",
    name: "Landing Page Copy",
    icon: <Megaphone className="w-4 h-4" />,
    description: "Hero, features, CTA structure",
    content: `# Landing Page Copy

## Hero Section
**Headline:**


**Subheadline:**


**CTA Button Text:**


---

## Problem Section
What pain points does your audience face?

-
-
-

---

## Solution Section
How does your product/service solve these problems?

**Feature 1:**
- Title:
- Description:

**Feature 2:**
- Title:
- Description:

**Feature 3:**
- Title:
- Description:

---

## Social Proof
Testimonials, stats, or trust indicators.

**Testimonial 1:**
- Quote:
- Author:

**Key Stat:**


---

## Final CTA
**Headline:**


**Button Text:**

`,
  },
  {
    id: "product-description",
    name: "Product Description",
    icon: <Target className="w-4 h-4" />,
    description: "Product features and benefits",
    content: `# Product Description

## Product Name


## Tagline


---

## Overview
Brief description of what the product is and who it's for.



---

## Key Features

**Feature 1:**
-

**Feature 2:**
-

**Feature 3:**
-

---

## Benefits
Why should customers care?

-
-
-

---

## Specifications
Technical details, dimensions, materials, etc.

-
-

---

## Pricing
- Price:
- What's included:

`,
  },
  {
    id: "team-bios",
    name: "Team Bios",
    icon: <Users className="w-4 h-4" />,
    description: "Team member profiles",
    content: `# Team

## Team Member 1
**Name:**
**Role:**
**Bio:**


**Social Links:**
- LinkedIn:
- Twitter:

---

## Team Member 2
**Name:**
**Role:**
**Bio:**


**Social Links:**
- LinkedIn:
- Twitter:

---

## Team Member 3
**Name:**
**Role:**
**Bio:**


**Social Links:**
- LinkedIn:
- Twitter:

`,
  },
  {
    id: "ai-context",
    name: "AI Context Document",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Custom context for AI generation",
    content: `# AI Generation Context

## Brand Voice & Tone
Describe how your brand communicates.

**Tone:** (professional, casual, playful, authoritative)


**Voice characteristics:**
-

---

## Target Audience
Who are you trying to reach?

**Demographics:**
-

**Psychographics:**
-

---

## Key Messages
What are the main points you want to communicate?

1.
2.
3.

---

## Visual Style Preferences
Colors, imagery style, layout preferences.

**Colors:**


**Imagery:**


**Layout:**


---

## Constraints & Requirements
Any specific requirements or things to avoid.

**Must include:**
-

**Must avoid:**
-

`,
  },
];

// ============================================================================
// EXISTING DOCUMENTS LIST
// ============================================================================

interface ExistingDocument {
  _id: Id<"organizationMedia">;
  filename: string;
  documentContent?: string;
  createdAt?: number;
}

type TxFn = (key: string, fallback: string) => string;

function ExistingDocumentsList({
  documents,
  onSelect,
  selectedId,
  isLoading,
  tx,
}: {
  documents: ExistingDocument[] | undefined;
  onSelect: (doc: ExistingDocument) => void;
  selectedId: string | null;
  isLoading: boolean;
  tx: TxFn;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-sm">
        {tx("ui.builder.docs.existing.empty", "No documents yet. Create one to get started.")}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {documents.map((doc) => (
        <button
          key={doc._id}
          onClick={() => onSelect(doc)}
          className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 transition-colors ${
            selectedId === doc._id
              ? "bg-neutral-600/20 text-neutral-300 border border-neutral-500/30"
              : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          <span className="truncate text-sm">{doc.filename}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// TEMPLATE SELECTOR
// ============================================================================

function TemplateSelector({
  onSelect,
  onClose,
  tx,
}: {
  onSelect: (template: DocumentTemplate) => void;
  onClose: () => void;
  tx: TxFn;
}) {
  return (
    <div className="absolute top-full left-0 mt-2 w-72 bg-neutral-900 rounded-lg shadow-xl border border-neutral-700 py-2 z-50">
      <div className="px-3 py-2 border-b border-neutral-700">
        <p className="text-xs text-neutral-400 font-medium">
          {tx("ui.builder.docs.template.choose", "Choose a template")}
        </p>
      </div>
      {DOCUMENT_TEMPLATES.map((template) => (
        <button
          key={template.id}
          onClick={() => {
            onSelect(template);
            onClose();
          }}
          className="w-full px-3 py-2 text-left hover:bg-neutral-800 transition-colors flex items-start gap-3"
        >
          <span className="text-neutral-400 mt-0.5">{template.icon}</span>
          <div>
            <div className="text-sm text-neutral-200">{template.name}</div>
            <div className="text-xs text-neutral-500">{template.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN DOCS EDITOR PANEL
// ============================================================================

interface DocsEditorPanelProps {
  onClose: () => void;
  onAttachToContext?: (content: string, filename: string) => void;
}

export function DocsEditorPanel({ onClose, onAttachToContext }: DocsEditorPanelProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const organizationId = currentOrg?.id;
  const { translationsMap } = useNamespaceTranslations("ui.builder");
  const tx = useCallback(
    (key: string, fallback: string): string => translationsMap?.[key] ?? fallback,
    [translationsMap],
  );

  // Document state
  const [documentName, setDocumentName] = useState("Untitled");
  const [documentContent, setDocumentContent] = useState("# Untitled Document\n\nStart writing here...");
  const [currentDocId, setCurrentDocId] = useState<Id<"organizationMedia"> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // UI state
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExisting, setShowExisting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mutations
  const createDocument = useMutation(api.organizationMedia.createLayerCakeDocument);
  const updateDocument = useMutation(api.organizationMedia.updateLayerCakeDocument);

  // Query existing documents
  const existingDocs = useQuery(
    api.organizationMedia.getLayerCakeDocuments,
    sessionId && organizationId
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  ) as ExistingDocument[] | undefined;

  // Handle template selection
  const handleTemplateSelect = useCallback((template: DocumentTemplate) => {
    if (hasUnsavedChanges) {
      if (!confirm(tx("ui.builder.docs.confirm.discardUnsaved", "You have unsaved changes. Discard them?"))) return;
    }
    setDocumentName(template.id === "blank" ? tx("ui.builder.docs.document.untitled", "Untitled") : template.name);
    setDocumentContent(template.content);
    setCurrentDocId(null);
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, tx]);

  // Handle existing document selection
  const handleDocumentSelect = useCallback((doc: ExistingDocument) => {
    if (hasUnsavedChanges) {
      if (!confirm(tx("ui.builder.docs.confirm.discardUnsaved", "You have unsaved changes. Discard them?"))) return;
    }
    setDocumentName(doc.filename.replace(/\.md$/, ""));
    setDocumentContent(doc.documentContent || "");
    setCurrentDocId(doc._id);
    setHasUnsavedChanges(false);
    setShowExisting(false);
  }, [hasUnsavedChanges, tx]);

  // Handle content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocumentContent(e.target.value);
    setHasUnsavedChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!sessionId || !organizationId) return;

    setIsSaving(true);
    try {
      if (currentDocId) {
        // Update existing
        await updateDocument({
          sessionId,
          mediaId: currentDocId,
          documentContent,
          filename: documentName.endsWith(".md") ? documentName : `${documentName}.md`,
        });
      } else {
        // Create new
        const result = await createDocument({
          sessionId,
          organizationId: organizationId as Id<"organizations">,
          filename: documentName.endsWith(".md") ? documentName : `${documentName}.md`,
          documentContent,
        });
        if (result?.docId) {
          setCurrentDocId(result.docId);
        }
      }
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to save document:", error);
      alert(tx("ui.builder.docs.error.saveFailed", "Failed to save document"));
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, organizationId, currentDocId, documentContent, documentName, createDocument, updateDocument, tx]);

  // Handle attach to context
  const handleAttachToContext = useCallback(() => {
    if (onAttachToContext && documentContent.trim()) {
      onAttachToContext(documentContent, documentName);
    }
  }, [onAttachToContext, documentContent, documentName]);

  // New document
  const handleNewDocument = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm(tx("ui.builder.docs.confirm.discardUnsaved", "You have unsaved changes. Discard them?"))) return;
    }
    setDocumentName(tx("ui.builder.docs.document.untitled", "Untitled"));
    setDocumentContent("# Untitled Document\n\nStart writing here...");
    setCurrentDocId(null);
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, tx]);

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={documentName}
            onChange={(e) => {
              setDocumentName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="bg-transparent text-neutral-100 font-medium text-sm border-b border-transparent hover:border-neutral-600 focus:border-neutral-500 focus:outline-none px-1 py-0.5"
            placeholder={tx("ui.builder.docs.input.documentName", "Document name")}
          />
          {hasUnsavedChanges && (
            <span className="text-xs text-neutral-500">
              {tx("ui.builder.docs.status.unsaved", "(unsaved)")}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-neutral-800 flex items-center gap-2">
        {/* New from Template */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTemplates(!showTemplates);
              setShowExisting(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {tx("ui.builder.docs.button.new", "New")}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showTemplates && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)} />
              <TemplateSelector
                onSelect={handleTemplateSelect}
                onClose={() => setShowTemplates(false)}
                tx={tx}
              />
            </>
          )}
        </div>

        {/* Open Existing */}
        <div className="relative">
          <button
            onClick={() => {
              setShowExisting(!showExisting);
              setShowTemplates(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {tx("ui.builder.docs.button.open", "Open")}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showExisting && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExisting(false)} />
              <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto bg-neutral-900 rounded-lg shadow-xl border border-neutral-700 py-2 z-50">
                <div className="px-3 py-2 border-b border-neutral-700">
                  <p className="text-xs text-neutral-400 font-medium">
                    {tx("ui.builder.docs.existing.yourDocuments", "Your Documents")}
                  </p>
                </div>
                <div className="p-2">
                  <ExistingDocumentsList
                    documents={existingDocs}
                    onSelect={handleDocumentSelect}
                    selectedId={currentDocId}
                    isLoading={existingDocs === undefined}
                    tx={tx}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || !hasUnsavedChanges}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            saveSuccess
              ? "bg-green-600/20 text-green-400"
              : hasUnsavedChanges
              ? "bg-neutral-600 text-white hover:bg-neutral-500"
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saveSuccess
            ? tx("ui.builder.docs.button.saved", "Saved!")
            : tx("ui.builder.docs.button.save", "Save")}
        </button>

        <div className="flex-1" />

        {/* Attach to AI Context */}
        {onAttachToContext && (
          <button
            onClick={handleAttachToContext}
            disabled={!documentContent.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-600/20 text-neutral-300 border border-neutral-500/30 hover:bg-neutral-600/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={tx("ui.builder.docs.button.attachContextTitle", "Attach this document as context for AI generation")}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {tx("ui.builder.docs.button.attachContext", "Use as AI Context")}
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden p-4">
        <textarea
          value={documentContent}
          onChange={handleContentChange}
          className="w-full h-full bg-neutral-800/50 text-neutral-100 text-sm font-mono leading-relaxed p-4 rounded-lg border border-neutral-700 focus:border-neutral-500 focus:outline-none resize-none"
          placeholder={tx("ui.builder.docs.input.startWriting", "Start writing your document...")}
          spellCheck={false}
        />
      </div>

      {/* Footer with tips */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-neutral-800 text-xs text-neutral-500">
        <span className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5" />
          {tx(
            "ui.builder.docs.footer.markdownTip",
            "Supports Markdown formatting. Documents are saved to your Files library.",
          )}
        </span>
      </div>
    </div>
  );
}
