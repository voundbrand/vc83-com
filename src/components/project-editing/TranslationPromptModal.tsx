"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Globe, ArrowRight, Loader2 } from "lucide-react";

type Language = "de" | "en";

interface TranslationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newValue: string) => Promise<void>;
  onSkip: () => void;
  blockId: string;
  originalLanguage: Language;
  targetLanguage: Language;
  originalValue: string;
  currentTargetValue: string;
  blockLabel?: string;
}

/**
 * Modal that prompts the user to update the other language version
 * after editing content in one language (LinkedIn-style UX).
 */
export function TranslationPromptModal({
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  originalLanguage,
  targetLanguage,
  originalValue,
  currentTargetValue,
  blockLabel,
}: TranslationPromptModalProps) {
  const [newValue, setNewValue] = useState(currentTargetValue);
  const [isSaving, setIsSaving] = useState(false);

  // Reset when modal opens with new content
  useEffect(() => {
    if (isOpen) {
      setNewValue(currentTargetValue);
    }
  }, [isOpen, currentTargetValue]);

  const handleConfirm = useCallback(async () => {
    if (newValue === currentTargetValue) {
      onSkip();
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm(newValue);
    } finally {
      setIsSaving(false);
    }
  }, [newValue, currentTargetValue, onConfirm, onSkip]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
      } else if (e.key === "Enter" && e.ctrlKey) {
        handleConfirm();
      }
    },
    [onSkip, handleConfirm]
  );

  if (!isOpen) return null;

  const languageLabels: Record<Language, string> = {
    de: "German",
    en: "English",
  };

  const languageFlags: Record<Language, string> = {
    de: "🇩🇪",
    en: "🇬🇧",
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSkip();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white">
          <div className="flex items-center gap-2">
            <Globe size={20} />
            <span className="font-medium">Update Translation?</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Explanation */}
          <p className="text-sm text-gray-600">
            You just updated the {languageLabels[originalLanguage]} version
            {blockLabel && (
              <span className="font-medium"> of &quot;{blockLabel}&quot;</span>
            )}
            . Would you like to update the {languageLabels[targetLanguage]}{" "}
            version as well?
          </p>

          {/* Language comparison */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-start">
            {/* Original (just changed) */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <span>{languageFlags[originalLanguage]}</span>
                <span>{languageLabels[originalLanguage]}</span>
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">
                  Updated
                </span>
              </div>
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-gray-700 min-h-[60px]">
                {originalValue}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center pt-6">
              <ArrowRight size={20} className="text-gray-400" />
            </div>

            {/* Target (to update) */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <span>{languageFlags[targetLanguage]}</span>
                <span>{languageLabels[targetLanguage]}</span>
              </div>
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded text-sm text-gray-700 min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
                placeholder={`Enter ${languageLabels[targetLanguage]} translation...`}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Current target value hint */}
          {currentTargetValue && currentTargetValue !== newValue && (
            <p className="text-xs text-gray-500">
              Current {languageLabels[targetLanguage]} value:{" "}
              <span className="italic">&quot;{currentTargetValue}&quot;</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-50 border-t">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            disabled={isSaving}
          >
            Skip for now
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Update {languageLabels[targetLanguage]}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
