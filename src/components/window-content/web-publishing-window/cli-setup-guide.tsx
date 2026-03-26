"use client";

import { useState } from "react";
import {
  Bot,
  CalendarCheck2,
  Check,
  Copy,
  LayoutTemplate,
  Link2,
  Rocket,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";

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
        background: "var(--window-document-text)",
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

function SectionTitle({ title }: { title: string }) {
  return (
    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--tone-accent)" }}>
      {title}
    </h4>
  );
}

function Step({ number, title, description, command, icon, note }: StepProps) {
  return (
    <div className="flex gap-3">
      {/* Step number indicator */}
      <div
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
        style={{
          background: "var(--tone-accent)",
          color: "white",
        }}
      >
        {number}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: "var(--tone-accent)" }}>{icon}</span>
          <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
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
 * CLI Setup Guide - Safe setup + rollout runbook for SevenLayers CLI
 *
 * Can be used in:
 * - Empty state when no applications are connected
 * - Modal for "Connect Another App" action
 */
export function CLISetupGuide({ variant = "full", showInstall = true, onDocsClick }: CLISetupGuideProps) {
  const steps: StepProps[] = [];
  const addStep = (step: Omit<StepProps, "number">) => {
    steps.push({
      number: steps.length + 1,
      ...step,
    });
  };

  if (showInstall) {
    addStep({
      title: "Install the CLI",
      description: "Install the compatibility package. Primary command is sevenlayers; legacy aliases remain available.",
      command: "npm install -g @sevenlayers/cli",
      icon: <Terminal size={16} />,
      note: "Aliases preserved: sevenlayers, l4yercak3, and icing.",
    });
  }

  addStep({
    title: "Configure staging target profile",
    description: "Define explicit backend/org/app defaults before any mutating command.",
    command:
      "sevenlayers env set staging --backend-url https://<backend-url> --org-id <org_id> --app-id <app_id>",
    icon: <Settings2 size={16} />,
    note: "Use staging first; avoid direct prod bootstrap until rollout gates pass.",
  });

  addStep({
    title: "Activate and validate target context",
    description: "Fail closed on target mismatch using the built-in doctor diagnostics.",
    command: "sevenlayers env use staging && sevenlayers doctor target --env staging --json",
    icon: <ShieldCheck size={16} />,
    note: "All mutating flows require resolved env+org+app tuple.",
  });

  addStep({
    title: "Initialize safely (non-destructive by default)",
    description: "Preview env changes before writing managed keys.",
    command: "sevenlayers app init --env staging --dry-run --json",
    icon: <ShieldCheck size={16} />,
    note: "Apply with explicit flags only after reviewing dry-run output.",
  });

  addStep({
    title: "Wire app metadata and pages",
    description: "Register/link app metadata and sync page declarations for CMS-aware routing.",
    command: "sevenlayers app register --env staging --name \"<app-name>\" --framework next --json",
    icon: <Link2 size={16} />,
    note: "Follow with: sevenlayers app link ..., sevenlayers app pages sync ..., sevenlayers app sync ...",
  });

  addStep({
    title: "Run CMS parity + binding checks",
    description: "Validate CMS schema parity and page binding contracts before publish.",
    command: "sevenlayers cms doctor --in .sevenlayers/cms-content.json --json",
    icon: <LayoutTemplate size={16} />,
    note: "Use cms registry pull/push and cms bind for scoped registry + page object binding updates.",
  });

  addStep({
    title: "Run booking + agent governance preflight",
    description: "Validate booking prerequisites and template governance before cutover.",
    command: "sevenlayers booking check --env staging --event-id <event_id> --product-id <product_id> --json",
    icon: <Bot size={16} />,
    note: "Also run: booking smoke --dry-run, agent permissions check, agent drift, and agent catalog telemetry.",
  });

  const rolloutSteps: StepProps[] = [
    {
      number: 1,
      title: "Preflight quality gates",
      description: "Block rollout if repo health checks fail.",
      command: "npm run typecheck && npm run docs:guard",
      icon: <ShieldCheck size={16} />,
    },
    {
      number: 2,
      title: "Alpha/canary publish confirmation",
      description: "Canary publish runs via packages-publish workflow on main merges.",
      command: "npm view @sevenlayers/cli dist-tags --json",
      icon: <Rocket size={16} />,
      note: "Confirm canary points to expected version before stable promotion.",
    },
    {
      number: 3,
      title: "Promote stable latest",
      description: "Promote current workspace package versions to latest after canary validation.",
      command: "gh workflow run packages-publish.yml -f promote_latest=true",
      icon: <CalendarCheck2 size={16} />,
      note: "Requires GitHub CLI auth and repository write permissions.",
    },
  ];

  const rollbackCommands = [
    "npm dist-tag add @sevenlayers/cli@<previous_version> latest",
    "npm dist-tag add @l4yercak3/sdk@<previous_version> latest",
    "npm dist-tag add @l4yercak3/cms@<previous_version> latest",
  ];

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
            background: "linear-gradient(135deg, var(--tone-accent) 0%, var(--tone-accent-strong) 100%)",
          }}
        >
          <Terminal size={32} style={{ color: "#0f0f0f" }} />
        </div>
        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
          SevenLayers CLI Safe Setup Runbook
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Use this flow for staged setup, guarded rollout, and deterministic rollback.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-5">
        {steps.map((step, index) => (
          <Step key={index} {...step} number={index + 1} />
        ))}
      </div>

      {/* Alias compatibility */}
      <div
        className="mt-6 p-3 border-2 text-xs"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <p className="font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
          Compatibility Aliases
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "sevenlayers", command: "sevenlayers --help" },
            { name: "l4yercak3", command: "l4yercak3 --help" },
            { name: "icing", command: "icing --help" },
          ].map((item) => (
            <span
              key={item.name}
              className="px-2 py-1 flex items-center gap-1"
              style={{
                background: "white",
                border: "1px solid var(--window-document-border)",
                color: "var(--window-document-text)",
              }}
            >
              <Terminal size={12} />
              <span>{item.command}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Alpha -> stable cutover */}
      <div className="mt-6 space-y-4">
        <SectionTitle title="Alpha -> Stable Cutover" />
        <div className="space-y-5">
          {rolloutSteps.map((step, index) => (
            <Step key={index} {...step} number={index + 1} />
          ))}
        </div>
      </div>

      {/* Rollback */}
      <div
        className="mt-6 p-3 border-2 text-xs"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <p className="font-bold mb-2 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <RotateCcw size={14} style={{ color: "var(--tone-accent)" }} />
          Rollback Runbook (dist-tag revert)
        </p>
        <p className="mb-2" style={{ color: "var(--neutral-gray)" }}>
          If stable promotion causes regressions, immediately repoint latest to the last known-good versions:
        </p>
        <div className="space-y-2">
          {rollbackCommands.map((command) => (
            <CopyableCommand key={command} command={command} />
          ))}
        </div>
      </div>

      {/* Help link */}
      <div className="mt-4 text-center">
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Need help?{" "}
          <a
            href="https://docs.sevenlayers.io/cli"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDocsClick}
            className="underline hover:no-underline"
            style={{ color: "var(--tone-accent)" }}
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
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: "var(--window-titlebar-bg)",
            color: "var(--window-document-text)",
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
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <InteriorButton onClick={onClose} variant="secondary">
            Close
          </InteriorButton>
        </div>
      </div>
    </div>
  );
}
