"use client";

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';

interface SafeHtmlRendererProps {
  html: string;
  className?: string;
}

/**
 * Safe HTML Renderer
 *
 * Uses TipTap (same rich text editor used for editing) to safely render HTML content.
 * This prevents XSS attacks by parsing and sanitizing HTML through TipTap's controlled rendering.
 *
 * Benefits:
 * - Automatic XSS protection
 * - Consistent styling with the editor
 * - No need for dangerouslySetInnerHTML
 */
export const SafeHtmlRenderer: React.FC<SafeHtmlRendererProps> = ({ html, className = '' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 transition-colors',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: html,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Remove prose classes that force center alignment
        // Let the HTML's own text-align attributes take precedence
        class: `max-w-none ${className}`,
      },
    },
  });

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
};
