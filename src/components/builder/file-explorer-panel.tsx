"use client";

/**
 * FILE EXPLORER PANEL
 *
 * Read-only file tree and viewer for builder app generated files.
 * Shows the file structure from v0-generated + scaffold files.
 */

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  Palette,
  FolderOpen,
  Folder,
  File,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  language?: string;
  children?: TreeNode[];
}

interface FileExplorerPanelProps {
  generatedFiles: GeneratedFile[];
}

// ============================================================================
// TREE BUILDER
// ============================================================================

function buildFileTree(files: GeneratedFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const name = parts[i];
      const fullPath = parts.slice(0, i + 1).join("/");

      if (isLast) {
        currentLevel.push({
          name,
          path: fullPath,
          type: "file",
          language: file.language,
        });
      } else {
        let folder = currentLevel.find(
          (n) => n.name === name && n.type === "folder"
        );
        if (!folder) {
          folder = { name, path: fullPath, type: "folder", children: [] };
          currentLevel.push(folder);
        }
        currentLevel = folder.children!;
      }
    }
  }

  return sortTree(root);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((node) => {
      if (node.type === "folder" && node.children) {
        return { ...node, children: sortTree(node.children) };
      }
      return node;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

// ============================================================================
// FILE ICON
// ============================================================================

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "jsx":
      return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
    case "ts":
    case "js":
      return <FileCode className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
    case "css":
      return <Palette className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
    case "json":
      return <FileText className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />;
    case "md":
      return <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />;
    default:
      return <File className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />;
  }
}

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedFolders,
  onToggleFolder,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.path === selectedPath;
  const paddingLeft = 8 + depth * 16;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.path)}
          className="w-full flex items-center gap-1.5 py-1 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          style={{ paddingLeft }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 py-1 px-2 text-xs transition-colors ${
        isSelected
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      }`}
      style={{ paddingLeft: paddingLeft + 16 }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ============================================================================
// FILE VIEWER
// ============================================================================

function FileViewer({ file }: { file: GeneratedFile | null }) {
  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">
        Select a file to view its contents
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900">
        <span className="text-xs text-zinc-400 truncate">{file.path}</span>
        <span className="text-[10px] text-zinc-600 ml-2 flex-shrink-0">
          {file.language}
        </span>
      </div>
      <div className="flex-1 overflow-auto bg-zinc-950 p-3">
        <pre className="text-xs text-zinc-300 font-mono whitespace-pre overflow-x-auto leading-relaxed">
          <code>{file.content}</code>
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-12">
      <FolderOpen className="w-10 h-10 mb-3 text-zinc-600" />
      <p className="text-sm font-medium">No files yet</p>
      <p className="text-xs mt-1 text-zinc-600">
        Generate a page to see its source files
      </p>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function FileExplorerPanel({ generatedFiles }: FileExplorerPanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set()
  );

  const tree = useMemo(() => buildFileTree(generatedFiles), [generatedFiles]);

  // Auto-expand all folders on first render
  useMemo(() => {
    const folders = new Set<string>();
    function collectFolders(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.type === "folder") {
          folders.add(node.path);
          if (node.children) collectFolders(node.children);
        }
      }
    }
    collectFolders(tree);
    if (folders.size > 0 && expandedFolders.size === 0) {
      setExpandedFolders(folders);
    }
  }, [tree]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedFile = useMemo(() => {
    if (!selectedPath) return null;
    return generatedFiles.find((f) => f.path === selectedPath) || null;
  }, [selectedPath, generatedFiles]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (generatedFiles.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-300">Files</span>
        <span className="text-[10px] text-zinc-600">
          {generatedFiles.length} file{generatedFiles.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* File tree */}
      <div className="flex-shrink-0 overflow-y-auto border-b border-zinc-800" style={{ maxHeight: "40%" }}>
        {tree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
          />
        ))}
      </div>

      {/* File viewer */}
      <FileViewer file={selectedFile} />
    </div>
  );
}
