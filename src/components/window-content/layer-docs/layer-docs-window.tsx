"use client";

import { useState } from "react";
import { Plus, FileText, Folder, Palette, NotebookText, X } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export function LayerDocsWindow() {
  const { t } = useNamespaceTranslations("ui.layer_docs");
  const tx = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
  const [showComingSoon, setShowComingSoon] = useState(true);

  return (
    <div className="h-full flex relative overflow-hidden" style={{ background: 'var(--win95-bg)' }}>
      {/* Sidebar - Mocked */}
      <div
        className="w-64 border-r-2 flex flex-col"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
          <button
            className="retro-button w-full px-3 py-2 text-xs font-pixel flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--win95-bg)',
              color: 'var(--win95-text)'
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{tx("sidebar.new_button", "New")}</span>
          </button>
        </div>

        {/* Document Tree - Mocked */}
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-1">
            {/* Mock document items */}
            <div className="flex items-center gap-2 px-2 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-pixel">{tx("sidebar.docs.welcome", "Welcome")}</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <Folder className="h-3.5 w-3.5" />
              <span className="font-pixel">{tx("sidebar.docs.guides", "Guides")}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-pixel">{tx("sidebar.docs.setup", "Setup")}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-pixel">{tx("sidebar.docs.usage", "Usage")}</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-pixel">{tx("sidebar.docs.notes", "Notes")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Area - Mocked */}
      <div className="flex-1 flex flex-col" style={{ background: '#FFFFFF' }}>
        {/* Editor Toolbar - Mocked */}
        <div
          className="border-b-2 px-4 py-2 flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <button className="retro-button px-2 py-1 text-xs font-pixel" title={tx("editor.toolbar.bold_title", "Bold")}>
            <span style={{ color: 'var(--win95-text)' }}>{tx("editor.toolbar.bold_label", "B")}</span>
          </button>
          <button className="retro-button px-2 py-1 text-xs font-pixel" title={tx("editor.toolbar.italic_title", "Italic")}>
            <span style={{ color: 'var(--win95-text)' }}>{tx("editor.toolbar.italic_label", "I")}</span>
          </button>
          <button className="retro-button px-2 py-1 text-xs font-pixel" title={tx("editor.toolbar.underline_title", "Underline")}>
            <span style={{ color: 'var(--win95-text)' }}>{tx("editor.toolbar.underline_label", "U")}</span>
          </button>
          <div className="w-px h-4 mx-1" style={{ background: 'var(--win95-border)' }}></div>
          <button className="retro-button px-2 py-1 text-xs font-pixel" title={tx("editor.toolbar.heading_title", "Heading")}>
            <span style={{ color: 'var(--win95-text)' }}>{tx("editor.toolbar.heading_label", "H1")}</span>
          </button>
          <button className="retro-button px-2 py-1 text-xs font-pixel" title={tx("editor.toolbar.list_title", "List")}>
            <span style={{ color: 'var(--win95-text)' }}>•</span>
          </button>
        </div>

        {/* Editor Content - Mocked */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-pixel mb-4 flex items-center gap-2" style={{ color: 'var(--win95-highlight)' }}>
                <Palette className="h-8 w-8" />
                {tx("editor.heading", "Welcome to L4YER.docs")}
              </h1>
            </div>

            <div className="space-y-4 leading-relaxed" style={{ color: 'var(--win95-text)' }}>
              <h2 className="text-xl font-pixel mt-6 mb-3" style={{ color: 'var(--win95-text)' }}>
                {tx("editor.getting_started_heading", "# Getting Started")}
              </h2>

              <p>
                {tx(
                  "editor.getting_started_body",
                  "This is your team's knowledge base. Create documents, organize them in folders, and collaborate with your team."
                )}
              </p>

              <h2 className="text-xl font-pixel mt-6 mb-3" style={{ color: 'var(--win95-text)' }}>
                {tx("editor.features_heading", "## Features")}
              </h2>

              <ul className="list-disc list-inside space-y-2">
                <li>{tx("editor.features.rich_text", "Rich text editing with block-based editor")}</li>
                <li>{tx("editor.features.file_uploads", "File uploads (images, PDFs, documents)")}</li>
                <li>{tx("editor.features.collaboration", "Team collaboration with permissions")}</li>
                <li>{tx("editor.features.full_text_search", "Full-text search across all documents")}</li>
                <li>{tx("editor.features.org_scoped", "Organization-scoped content")}</li>
              </ul>

              <div className="mt-8 p-4 border-2 border-dashed rounded text-center" style={{ borderColor: 'var(--win95-border)', color: 'var(--win95-text-secondary)' }}>
                <p className="text-sm">
                  {tx("editor.command_hint_prefix", "Type")}{" "}
                  <code className="px-2 py-1 rounded" style={{ background: 'var(--win95-bg-light)' }}>/</code>{" "}
                  {tx("editor.command_hint_suffix", "for commands")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Overlay */}
      {showComingSoon && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000
          }}
          onClick={() => setShowComingSoon(false)}
        >
          <div
            className="retro-window window-corners p-8 text-center max-w-md"
            style={{
              background: 'var(--win95-bg)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Window Title Bar */}
            <div
              className="retro-title-bar mb-6 -mx-8 -mt-8 px-4 py-2 flex items-center gap-2"
              style={{
                background: 'linear-gradient(90deg, #000080, #1084d0)',
                color: 'white'
              }}
            >
              <span className="font-pixel text-xs">{tx("overlay.title_bar_label", "L4YER.docs")}</span>
              <div className="ml-auto flex gap-1">
                <button
                  className="retro-control-button"
                  onClick={() => setShowComingSoon(false)}
                  title={tx("overlay.close_title", "Close")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

          {/* Content */}
          <div className="space-y-4">
            <NotebookText className="h-14 w-14 mx-auto" />

            <h2 className="text-2xl font-pixel mb-4" style={{ color: 'var(--win95-highlight)' }}>
              {tx("overlay.heading", "Coming Soon")}
            </h2>

            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--win95-text)' }}>
              {tx(
                "overlay.description",
                "L4YER.docs is your organization's knowledge base with Notion-style editing, file uploads, and team collaboration."
              )}
            </p>

            <div
              className="border-2 p-4 text-left space-y-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)'
              }}
            >
              <p className="text-xs font-pixel mb-2" style={{ color: 'var(--win95-highlight)' }}>
                {tx("overlay.planned_features_heading", "Planned Features:")}
              </p>
              <ul className="text-xs space-y-1" style={{ color: 'var(--win95-text)' }}>
                <li>{tx("overlay.features.rich_text_block", "Rich text block editor")}</li>
                <li>{tx("overlay.features.hierarchical_tree", "Hierarchical document tree")}</li>
                <li>{tx("overlay.features.image_uploads", "Image and file uploads")}</li>
                <li>{tx("overlay.features.full_text_search", "Full-text search (Cmd+K)")}</li>
                <li>{tx("overlay.features.org_permissions", "Organization permissions")}</li>
                <li>{tx("overlay.features.realtime_collab", "Real-time collaboration")}</li>
              </ul>
            </div>

            <p className="text-xs mt-6" style={{ color: 'var(--win95-text)' }}>
              {tx("overlay.details_prefix", "See")}{" "}
              <code className="px-2 py-1 text-[10px]" style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
                {tx("overlay.details_path", ".kiro/notion_ui_wiki/000_prd.md")}
              </code>{" "}
              {tx("overlay.details_suffix", "for details")}
            </p>

            <button
              className="retro-button mt-6 px-6 py-2 text-sm font-pixel"
              onClick={() => setShowComingSoon(false)}
              style={{
                backgroundColor: 'var(--win95-bg)',
                color: 'var(--win95-text)'
              }}
            >
              {tx("overlay.preview_cta", "Preview UI")}
            </button>

            <p className="text-[10px] mt-2" style={{ color: 'var(--win95-text)' }}>
              {tx("overlay.dismiss_hint", "(Click outside or press X to close)")}
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
