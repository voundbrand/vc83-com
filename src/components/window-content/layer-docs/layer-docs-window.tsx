"use client";

import { useState } from "react";
import { Plus, FileText, Folder, Palette, NotebookText, X } from "lucide-react";

export function LayerDocsWindow() {
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
            <span>New</span>
          </button>
        </div>

        {/* Document Tree - Mocked */}
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-1">
            {/* Mock document items */}
            <div className="flex items-center gap-2 px-2 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-pixel">Welcome</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <Folder className="h-3.5 w-3.5" />
              <span className="font-pixel">Guides</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-pixel">Setup</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-pixel">Usage</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 text-xs" style={{ color: 'var(--win95-text)' }}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-pixel">Notes</span>
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
          <button className="retro-button px-2 py-1 text-xs font-pixel" title="Bold">
            <span style={{ color: 'var(--win95-text)' }}>B</span>
          </button>
          <button className="retro-button px-2 py-1 text-xs font-pixel" title="Italic">
            <span style={{ color: 'var(--win95-text)' }}>I</span>
          </button>
          <button className="retro-button px-2 py-1 text-xs font-pixel" title="Underline">
            <span style={{ color: 'var(--win95-text)' }}>U</span>
          </button>
          <div className="w-px h-4 mx-1" style={{ background: 'var(--win95-border)' }}></div>
          <button className="retro-button px-2 py-1 text-xs font-pixel" title="Heading">
            <span style={{ color: 'var(--win95-text)' }}>H1</span>
          </button>
          <button className="retro-button px-2 py-1 text-xs font-pixel" title="List">
            <span style={{ color: 'var(--win95-text)' }}>•</span>
          </button>
        </div>

        {/* Editor Content - Mocked */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-pixel mb-4 flex items-center gap-2" style={{ color: 'var(--win95-highlight)' }}>
                <Palette className="h-8 w-8" />
                Welcome to L4YER.docs
              </h1>
            </div>

            <div className="space-y-4 leading-relaxed" style={{ color: 'var(--win95-text)' }}>
              <h2 className="text-xl font-pixel mt-6 mb-3" style={{ color: 'var(--win95-text)' }}>
                # Getting Started
              </h2>

              <p>
                This is your team&apos;s knowledge base. Create documents, organize them in folders,
                and collaborate with your team.
              </p>

              <h2 className="text-xl font-pixel mt-6 mb-3" style={{ color: 'var(--win95-text)' }}>
                ## Features
              </h2>

              <ul className="list-disc list-inside space-y-2">
                <li>Rich text editing with block-based editor</li>
                <li>File uploads (images, PDFs, documents)</li>
                <li>Team collaboration with permissions</li>
                <li>Full-text search across all documents</li>
                <li>Organization-scoped content</li>
              </ul>

              <div className="mt-8 p-4 border-2 border-dashed rounded text-center" style={{ borderColor: 'var(--win95-border)', color: 'var(--win95-text-secondary)' }}>
                <p className="text-sm">Type <code className="px-2 py-1 rounded" style={{ background: 'var(--win95-bg-light)' }}>/</code> for commands</p>
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
              <span className="font-pixel text-xs">L4YER.docs</span>
              <div className="ml-auto flex gap-1">
                <button
                  className="retro-control-button"
                  onClick={() => setShowComingSoon(false)}
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

          {/* Content */}
          <div className="space-y-4">
            <NotebookText className="h-14 w-14 mx-auto" />

            <h2 className="text-2xl font-pixel mb-4" style={{ color: 'var(--win95-highlight)' }}>
              Coming Soon
            </h2>

            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--win95-text)' }}>
              L4YER.docs is your organization&apos;s knowledge base with Notion-style
              editing, file uploads, and team collaboration.
            </p>

            <div
              className="border-2 p-4 text-left space-y-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)'
              }}
            >
              <p className="text-xs font-pixel mb-2" style={{ color: 'var(--win95-highlight)' }}>
                Planned Features:
              </p>
              <ul className="text-xs space-y-1" style={{ color: 'var(--win95-text)' }}>
                <li>Rich text block editor</li>
                <li>Hierarchical document tree</li>
                <li>Image and file uploads</li>
                <li>Full-text search (Cmd+K)</li>
                <li>Organization permissions</li>
                <li>Real-time collaboration</li>
              </ul>
            </div>

            <p className="text-xs mt-6" style={{ color: 'var(--win95-text)' }}>
              See <code className="px-2 py-1 text-[10px]" style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
                .kiro/notion_ui_wiki/000_prd.md
              </code> for details
            </p>

            <button
              className="retro-button mt-6 px-6 py-2 text-sm font-pixel"
              onClick={() => setShowComingSoon(false)}
              style={{
                backgroundColor: 'var(--win95-bg)',
                color: 'var(--win95-text)'
              }}
            >
              Preview UI
            </button>

            <p className="text-[10px] mt-2" style={{ color: 'var(--win95-text)' }}>
              (Click outside or press X to close)
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
