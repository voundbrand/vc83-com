"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import SimpleTiptapEditor from '@/components/ui/tiptap-editor-simple';
import { useNamespaceTranslations } from '@/hooks/use-namespace-translations';

interface EventDescriptionSectionProps {
  description: string;
  onDescriptionChange: (html: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const EventDescriptionSection: React.FC<EventDescriptionSectionProps> = ({
  description,
  onDescriptionChange,
  isOpen,
  onToggle,
}) => {
  const { t } = useNamespaceTranslations("ui.events");
  const [aiSuggestionClicked, setAiSuggestionClicked] = useState(false);

  // Helper to strip HTML for preview
  const stripHtml = (html: string): string => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const plainText = stripHtml(description);

  if (!isOpen) {
    return (
      <div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <div className="flex-1">
            <span className="text-sm font-bold">📝 {t('ui.events.form.description')}</span>
            {description && (
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {plainText.substring(0, 80) + (plainText.length > 80 ? '...' : '')}
              </p>
            )}
          </div>
          <ChevronDown size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          color: "var(--win95-text)",
        }}
      >
        <span className="text-sm font-bold">📝 {t('ui.events.form.description')}</span>
        <ChevronUp size={16} />
      </button>

      <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t('ui.events.form.description_help')}
        </p>

        {/* Editor */}
        <SimpleTiptapEditor
          value={description}
          onChange={onDescriptionChange}
          placeholder={t('ui.events.form.description_placeholder')}
          minHeight="300px"
        />

        {/* AI Suggestion (Future Feature) */}
        <div className="flex items-center justify-between p-2 border-2" style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)"
        }}>
          <div
            className="flex items-center text-xs cursor-pointer transition-colors"
            onClick={() => setAiSuggestionClicked(!aiSuggestionClicked)}
            style={{ color: aiSuggestionClicked ? "var(--primary)" : "var(--neutral-gray)" }}
          >
            <Zap
              className="mr-2"
              size={14}
              style={{ color: aiSuggestionClicked ? "var(--warning)" : "var(--neutral-gray)" }}
            />
            <span>{t('ui.events.form.ai_suggestions')}</span>
          </div>

          {aiSuggestionClicked && (
            <span className="text-xs italic" style={{ color: "var(--neutral-gray)" }}>
              {t('ui.events.form.coming_soon')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDescriptionSection;
