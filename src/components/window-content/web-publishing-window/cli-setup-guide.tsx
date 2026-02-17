"use client";

import { useState } from "react";
import { Check, Copy, Terminal, LogIn, FolderPlus, X } from "lucide-react";
import { RetroButton } from "@/components/retro-button";

interface CLISetupGuideProps {
  /** Compact mode for inline display, full mode for modals */
  variant?: "compact" | "full";
  /** Show the install step (for first-time users) */
  showInstall?: boolean;
  /** Callback when user clicks a documentation link */
  onDocsClick?: () => void;
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  command: string;
  icon: React.ReactNode;
  note?: string;
}

function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className="flex items-center justify-between gap-2 p-2 font-mono text-xs group"
      style={{
        background: "var(--win95-text)",
        color: "#00ff00", // Terminal green
      }}
    >
      <code className="flex-1 overflow-x-auto whitespace-nowrap">
        <span style={{ color: "#888" }}>$ </span>
        {command}
      </code>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 p-1 transition-colors hover:bg-white/10 rounded"
        title={copied ? "Copied!" : "Copy to clipboard"}
      >
        {copied ? (
          <Check size={14} style={{ color: "#00ff00" }} />
        ) : (
          <Copy size={14} style={{ color: "#888" }} className="group-hover:text-white" />
        )}
      </button>
    </div>
  );
}

function Step({ number, title, description, command, icon, note }: StepProps) {
  return (
    <div className="flex gap-3">
      {/* Step number indicator */}
      <div
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
        style={{
          background: "var(--win95-highlight)",
          color: "white",
        }}
      >
        {number}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: "var(--win95-highlight)" }}>{icon}</span>
          <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            {title}
          </h4>
        </div>
        <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
          {description}
        </p>
        <CopyableCommand command={command} />
        {note && (
          <p className="text-xs mt-1.5 italic" style={{ color: "var(--neutral-gray)" }}>
             {note}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * CLI Setup Guide - Step-by-step instructions for connecting an app via CLI
 *
 * Can be used in:
 * - Empty state when no applications are connected
 * - Modal for "Connect Another App" action
 */
export function CLISetupGuide({ variant = "full", showInstall = true }: CLISetupGuideProps) {
  const steps: StepProps[] = [];

  if (showInstall) {
    steps.push({
      number: steps.length + 1,
      title: "Install the CLI",
      description: "Install the L4YERCAK3 CLI globally using npm, yarn, or pnpm.",
      command: "npm install -g l4yercak3",
      icon: <Terminal size={16} />,
      note: "Or use: yarn global add l4yercak3 / pnpm add -g l4yercak3",
    });
  }

  steps.push(
    {
      number: steps.length + 1,
      title: "Authenticate",
      description: "Log in to your L4YERCAK3 account. This opens a browser window for secure authentication.",
      command: "l4yercak3 login",
      icon: <LogIn size={16} />,
      note: "Your credentials are stored securely in your system keychain.",
    },
    {
      number: steps.length + 2,
      title: "Initialize Your Project",
      description: "Navigate to your project directory and run init. This connects your app to L4YERCAK3.",
      command: "l4yercak3 init",
      icon: <FolderPlus size={16} />,
      note: "The CLI will detect your framework and guide you through the setup.",
    }
  );

  if (variant === "compact") {
    return (
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Step key={index} {...step} number={index + 1} />
        ))}
      </div>
    );
  }

  // Full variant with header and additional info
  return (
    <div>
      {/* Header */}
      <div className="mb-6 text-center">
        <div
          className="w-16 h-16 mx-auto mb-3 flex items-center justify-center rounded-lg"
          style={{
            background: "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
          }}
        >
          <Terminal size={32} className="text-white" />
        </div>
        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
          Connect Your App via CLI
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Follow these steps to connect your application to L4YERCAK3
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-5">
        {steps.map((step, index) => (
          <Step key={index} {...step} number={index + 1} />
        ))}
      </div>

      {/* Supported Frameworks */}
      <div
        className="mt-6 p-3 border-2 text-xs"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <p className="font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          Supported Frameworks
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "Next.js", icon: "▲" },
            { name: "Remix", icon: "R" },
            { name: "Astro", icon: "A" },
            { name: "Vite", icon: "V" },
            { name: "Nuxt", icon: "N" },
            { name: "SvelteKit", icon: "S" },
          ].map((fw) => (
            <span
              key={fw.name}
              className="px-2 py-1 flex items-center gap-1"
              style={{
                background: "white",
                border: "1px solid var(--win95-border)",
                color: "var(--win95-text)",
              }}
            >
              <span>{fw.icon}</span>
              <span>{fw.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Help link */}
      <div className="mt-4 text-center">
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Need help?{" "}
          <a
            href="https://docs.l4yercak3.com/cli"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
            style={{ color: "var(--win95-highlight)" }}
          >
            View CLI Documentation →
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Modal wrapper for the CLI Setup Guide
 */
interface CLISetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  showInstall?: boolean;
}

export function CLISetupModal({ isOpen, onClose, showInstall = false }: CLISetupModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border-4 shadow-lg"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: "var(--win95-titlebar)",
            color: "var(--win95-titlebar-text)",
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Terminal size={16} />
            Connect Application
          </span>
          <button
            onClick={onClose}
            className="hover:bg-white/20 px-2 py-0.5 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <CLISetupGuide variant="full" showInstall={showInstall} />
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t-2 flex justify-end"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <RetroButton onClick={onClose} variant="secondary">
            Close
          </RetroButton>
        </div>
      </div>
    </div>
  );
}
