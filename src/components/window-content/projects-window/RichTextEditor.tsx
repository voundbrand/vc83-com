/**
 * RICH TEXT EDITOR
 * Wrapper around SimpleTiptapEditor for project descriptions
 */

"use client";

import React from "react";
import SimpleTiptapEditor from "@/components/ui/tiptap-editor-simple";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write a detailed description...",
  disabled = false,
}: RichTextEditorProps) {
  if (disabled) {
    return (
      <div className="relative">
        <SimpleTiptapEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight="200px"
        />
        <div className="absolute inset-0 bg-gray-100 opacity-50 cursor-not-allowed" />
      </div>
    );
  }

  return (
    <SimpleTiptapEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight="200px"
    />
  );
}
