/**
 * RICH TEXT EDITOR
 * TipTap-based WYSIWYG editor for project descriptions
 */

"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

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
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-purple-600 underline",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false, // Prevent SSR hydration mismatches
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when value changes externally
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? "bg-purple-100 text-purple-700" : "text-gray-700"
      }`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-300 rounded bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-300 bg-gray-50 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight size={16} />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          active={editor.isActive("link")}
          title="Add Link"
        >
          <Link2 size={16} />
        </ToolbarButton>

        {editor.isActive("link") && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove Link"
          >
            <span className="text-xs font-bold">✕</span>
          </ToolbarButton>
        )}
      </div>

      {/* Editor Content */}
      <div className="prose prose-sm max-w-none p-3 min-h-[200px] focus-within:outline-none">
        <EditorContent
          editor={editor}
          className="focus:outline-none"
          placeholder={placeholder}
        />
      </div>

      {disabled && (
        <div className="absolute inset-0 bg-gray-100 opacity-50 cursor-not-allowed" />
      )}
    </div>
  );
}
