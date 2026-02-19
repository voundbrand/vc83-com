"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Code2
} from 'lucide-react';

/**
 * Toolbar Button - Defined OUTSIDE the main component to prevent recreation on every render
 * Uses onMouseDown with preventDefault to maintain editor focus
 */
interface ToolbarButtonProps {
  onAction: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onAction,
  isActive,
  title,
  children,
  disabled = false
}) => (
  <button
    type="button"
    // Use onMouseDown instead of onClick - this fires before blur event
    // and preventDefault keeps focus in the editor
    onMouseDown={(e) => {
      e.preventDefault(); // Crucial: prevents editor from losing focus
      if (!disabled) {
        onAction();
      }
    }}
    disabled={disabled}
    className={`p-1.5 border-2 ${isActive ? 'shadow-inner' : ''} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    style={{
      borderColor: "var(--shell-border)",
      background: isActive ? "var(--shell-border)" : "var(--shell-button-surface)",
      color: "var(--shell-text)",
      cursor: disabled ? "not-allowed" : "pointer",
    }}
    title={title}
  >
    {children}
  </button>
);

const Divider: React.FC = () => (
  <div className="w-px h-6 mx-1" style={{ background: "var(--shell-border)" }} />
);

/**
 * Menu Bar Component - Separated to optimize rendering
 */
interface MenuBarProps {
  editor: Editor;
  isCodeView: boolean;
  onCodeViewToggle: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor, isCodeView, onCodeViewToggle }) => {
  // Force re-render when editor state changes (selection, content)
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // Subscribe to editor updates for reactive toolbar state
    const handleUpdate = () => forceUpdate({});
    const handleSelectionUpdate = () => forceUpdate({});

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('focus', handleUpdate);
    editor.on('blur', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('focus', handleUpdate);
      editor.off('blur', handleUpdate);
    };
  }, [editor]);

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const removeLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  return (
    <div
      className="border-b-2 p-1 flex flex-wrap gap-1"
      style={{
        borderColor: "var(--shell-border)",
        background: "var(--shell-button-surface)",
      }}
    >
      {/* Text formatting */}
      <ToolbarButton
        onAction={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <UnderlineIcon size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onAction={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={14} />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onAction={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered size={14} />
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton
        onAction={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight size={14} />
      </ToolbarButton>

      <Divider />

      {/* Link */}
      <ToolbarButton
        onAction={editor.isActive('link') ? removeLink : addLink}
        isActive={editor.isActive('link')}
        title={editor.isActive('link') ? 'Remove Link' : 'Add Link'}
      >
        <Link2 size={14} />
      </ToolbarButton>

      <Divider />

      {/* Undo/Redo */}
      <ToolbarButton
        onAction={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo size={14} />
      </ToolbarButton>

      <ToolbarButton
        onAction={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo size={14} />
      </ToolbarButton>

      <Divider />

      {/* Code View Toggle */}
      <ToolbarButton
        onAction={onCodeViewToggle}
        isActive={isCodeView}
        title={isCodeView ? "Visual Editor" : "Source Code"}
      >
        <Code2 size={14} />
      </ToolbarButton>
    </div>
  );
};

interface SimpleTiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const SimpleTiptapEditor: React.FC<SimpleTiptapEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  minHeight = '200px'
}) => {
  // Track if we're updating internally to prevent loops
  const isInternalUpdate = useRef(false);

  // Track view mode (visual vs code)
  const [isCodeView, setIsCodeView] = useState(false);
  const [codeContent, setCodeContent] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `min-height: ${minHeight}; padding: 12px;`,
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
  });

  // Update editor content when value changes externally (not from typing)
  useEffect(() => {
    if (!editor) return;

    // Skip if this update came from the editor itself
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    // Only update if the content is actually different
    const currentContent = editor.getHTML();
    if (value !== currentContent) {
      editor.commands.setContent(value, { emitUpdate: false });
      setCodeContent(value); // Also update code content
    }
  }, [value, editor]);

  const handleCodeViewToggle = useCallback(() => {
    if (!editor) return;

    if (!isCodeView) {
      // Switching to code view - update code content from editor
      setCodeContent(editor.getHTML());
    } else {
      // Switching back to visual - update editor from code content
      editor.commands.setContent(codeContent, { emitUpdate: false });
      onChange(codeContent);
    }
    setIsCodeView(!isCodeView);
  }, [editor, isCodeView, codeContent, onChange]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className="border-2 overflow-hidden"
      style={{
        borderColor: "var(--shell-border)",
        background: "var(--shell-input-surface)",
      }}
    >
      {/* Toolbar */}
      <MenuBar
        editor={editor}
        isCodeView={isCodeView}
        onCodeViewToggle={handleCodeViewToggle}
      />

      {/* Editor Content or Code View */}
      {isCodeView ? (
        <textarea
          value={codeContent}
          onChange={(e) => {
            setCodeContent(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full p-3 font-mono text-sm border-0 focus:outline-none"
          style={{
            minHeight,
            background: "var(--shell-input-surface)",
            color: "var(--shell-input-text)",
            fontFamily: 'monospace',
            resize: 'vertical'
          }}
          placeholder="Enter HTML code here..."
        />
      ) : (
        <div style={{ background: "var(--shell-input-surface)", color: "var(--shell-input-text)" }}>
          <EditorContent editor={editor} placeholder={placeholder} />
        </div>
      )}
    </div>
  );
};

export default SimpleTiptapEditor;
