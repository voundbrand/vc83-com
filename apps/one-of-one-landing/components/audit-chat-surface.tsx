"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Send } from "lucide-react";
import {
  persistLandingAuditMessages,
  persistLandingAuditTokens,
  readLandingAuditState,
  resolveLandingAuditRuntimeConfig,
  sendLandingAuditMessage,
  type LandingAuditMessage,
} from "../lib/audit-chat-client";
import { resolveLandingEntrypointLatencyMs, trackLandingEvent } from "../lib/analytics";
import type { Language } from "./language-switcher";

const STARTER_MESSAGES: Record<Language, string> = {
  en: "I help businesses figure out where an assistant would take the most pressure off their team. Tell me what your business does and I\u2019ll show you which one fits.",
  de: "Ich helfe Unternehmen herauszufinden, wo ein Assistent ihr Team am meisten entlasten w\u00FCrde. Erz\u00E4hlen Sie mir, was Ihr Unternehmen macht \u2014 und ich zeige Ihnen, welcher passt.",
};

const CHAT_UI: Record<Language, { subtitle: string; placeholder: string; send: string }> = {
  en: { subtitle: "Business diagnostic \u00B7 5 minutes", placeholder: "Your answer\u2026", send: "Send" },
  de: { subtitle: "Unternehmens-Diagnose \u00B7 5 Minuten", placeholder: "Ihre Antwort\u2026", send: "Senden" },
};

function buildStarterMessage(language: Language): LandingAuditMessage {
  return {
    id: "audit_starter",
    role: "assistant",
    content: STARTER_MESSAGES[language] || STARTER_MESSAGES.en,
    timestamp: Date.now(),
  };
}

function resolveSupportedLanguage(value: string | null | undefined): Language | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("en")) return "en";
  return null;
}

function resolveStarterLanguage(preferredLanguage: Language): Language {
  const preferredResolved = resolveSupportedLanguage(preferredLanguage);
  if (preferredResolved) return preferredResolved;

  if (typeof window !== "undefined") {
    const browserCandidates = [navigator.language, ...(navigator.languages || [])];
    for (const candidate of browserCandidates) {
      const resolved = resolveSupportedLanguage(candidate);
      if (resolved) return resolved;
    }
  }

  return "en";
}

function makeMessageId(role: LandingAuditMessage["role"]): string {
  return `audit_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function countMessagesByRole(messages: LandingAuditMessage[], role: LandingAuditMessage["role"]): number {
  return messages.reduce((count, message) => (message.role === role ? count + 1 : count), 0);
}

function getLastAssistantMessage(messages: LandingAuditMessage[]): LandingAuditMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      return messages[index];
    }
  }

  return null;
}

function isDuplicateInboundAckError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.toLowerCase().includes("duplicate inbound event acknowledged");
}

type FormattedBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "ordered_list"; items: string[] }
  | { kind: "unordered_list"; items: string[] };

function normalizeAssistantContent(content: string): string {
  return content
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseFormattedBlocks(content: string): FormattedBlock[] {
  const normalized = normalizeAssistantContent(content);
  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const blocks: FormattedBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const orderedLine = (lines[index] ?? "").trim();
        const match = orderedLine.match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(match[1].trim());
        index += 1;
      }
      if (items.length > 0) {
        blocks.push({ kind: "ordered_list", items });
      }
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const unorderedLine = (lines[index] ?? "").trim();
        const match = unorderedLine.match(/^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(match[1].trim());
        index += 1;
      }
      if (items.length > 0) {
        blocks.push({ kind: "unordered_list", items });
      }
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const paragraphLine = (lines[index] ?? "").trim();
      if (!paragraphLine) {
        index += 1;
        break;
      }
      if (/^\d+\.\s+/.test(paragraphLine) || /^[-*]\s+/.test(paragraphLine)) {
        break;
      }
      paragraphLines.push(paragraphLine);
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraphLines.join(" ") });
    }
  }

  return blocks;
}

function renderInlineBold(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const tokens: Array<{ type: "text" | "strong" | "em" | "link"; value: string; href?: string }> = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(text)) !== null) {
    const full = match[0];
    const start = match.index;
    if (start > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, start) });
    }

    const markdownLinkMatch = full.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (markdownLinkMatch) {
      tokens.push({
        type: "link",
        value: markdownLinkMatch[1],
        href: markdownLinkMatch[2],
      });
      lastIndex = pattern.lastIndex;
      continue;
    }

    if (full.startsWith("http://") || full.startsWith("https://")) {
      tokens.push({ type: "link", value: full, href: full });
      lastIndex = pattern.lastIndex;
      continue;
    }

    if (full.startsWith("**") && full.endsWith("**")) {
      tokens.push({ type: "strong", value: full.slice(2, -2) });
      lastIndex = pattern.lastIndex;
      continue;
    }

    if (full.startsWith("*") && full.endsWith("*")) {
      tokens.push({ type: "em", value: full.slice(1, -1) });
      lastIndex = pattern.lastIndex;
      continue;
    }

    if (full.startsWith("_") && full.endsWith("_")) {
      tokens.push({ type: "em", value: full.slice(1, -1) });
      lastIndex = pattern.lastIndex;
      continue;
    }

    tokens.push({ type: "text", value: full });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  tokens.forEach((token, index) => {
    if (token.type === "strong") {
      out.push(<strong key={`assistant_strong_${index}`}>{token.value}</strong>);
      return;
    }
    if (token.type === "em") {
      out.push(<em key={`assistant_em_${index}`}>{token.value}</em>);
      return;
    }
    if (token.type === "link" && token.href) {
      out.push(
        <a
          key={`assistant_link_${index}`}
          href={token.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {token.value}
        </a>
      );
      return;
    }
    out.push(token.value);
  });

  return out;
}

function renderAssistantContent(content: string): ReactNode {
  const blocks = parseFormattedBlocks(content);
  if (blocks.length === 0) {
    return content;
  }

  return blocks.map((block, blockIndex) => {
    if (block.kind === "ordered_list") {
      return (
        <ol key={`assistant_ol_${blockIndex}`} className="list-decimal ml-5 space-y-1">
          {block.items.map((item, itemIndex) => (
            <li key={`assistant_ol_item_${blockIndex}_${itemIndex}`}>{renderInlineBold(item)}</li>
          ))}
        </ol>
      );
    }

    if (block.kind === "unordered_list") {
      return (
        <ul key={`assistant_ul_${blockIndex}`} className="list-disc ml-5 space-y-1">
          {block.items.map((item, itemIndex) => (
            <li key={`assistant_ul_item_${blockIndex}_${itemIndex}`}>{renderInlineBold(item)}</li>
          ))}
        </ul>
      );
    }

    return <p key={`assistant_p_${blockIndex}`}>{renderInlineBold(block.text)}</p>;
  });
}

export function AuditChatSurface({ preferredLanguage = "en" }: { preferredLanguage?: Language }) {
  const runtimeConfig = useMemo(() => resolveLandingAuditRuntimeConfig(), []);
  const activeLanguage = useMemo(() => resolveStarterLanguage(preferredLanguage), [preferredLanguage]);
  const ui = CHAT_UI[activeLanguage] || CHAT_UI.en;
  const [messages, setMessages] = useState<LandingAuditMessage[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    const snapshot = readLandingAuditState();
    setSessionToken(snapshot.sessionToken);
    setClaimToken(snapshot.claimToken);

    if (snapshot.messages.length > 0) {
      setMessages(snapshot.messages);
      return;
    }

    const starterMessage = buildStarterMessage(activeLanguage);
    setMessages([starterMessage]);
    persistLandingAuditMessages([starterMessage]);
  }, [activeLanguage]);

  useEffect(() => {
    persistLandingAuditMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (!threadContainerRef.current) {
      return;
    }
    threadContainerRef.current.scrollTo({
      top: threadContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isSending, messages]);

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSendingRef.current) {
      return;
    }
    isSendingRef.current = true;

    const userMessage: LandingAuditMessage = {
      id: makeMessageId("user"),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    const nextUserStepOrdinal = countMessagesByRole(messages, "user") + 1;
    const previousAssistantMessage = getLastAssistantMessage(messages);
    const questionLatencyMs =
      previousAssistantMessage ? Math.max(0, userMessage.timestamp - previousAssistantMessage.timestamp) : undefined;
    const continuity = {
      hasSessionToken: Boolean(sessionToken),
      hasClaimToken: Boolean(claimToken),
    };

    if (nextUserStepOrdinal === 1) {
      const firstMessageLatencyMs = resolveLandingEntrypointLatencyMs(userMessage.timestamp);
      if (typeof firstMessageLatencyMs === "number") {
        trackLandingEvent({
          eventName: "onboarding.funnel.channel_first_message_latency",
          continuity,
          onceKey: "audit_first_message_latency",
          metadata: {
            latencyMs: firstMessageLatencyMs,
            latencyStep: "landing_view_to_first_user_message",
          },
        });
      }

      trackLandingEvent({
        eventName: "onboarding.funnel.audit_started",
        continuity,
        onceKey: "audit_started",
        metadata: {
          stepOrdinal: 1,
          hasConfiguredAgentId: Boolean(runtimeConfig.agentId),
        },
      });
    }

    trackLandingEvent({
      eventName: "onboarding.funnel.audit_question_answered",
      continuity,
      metadata: {
        stepOrdinal: nextUserStepOrdinal,
        questionLatencyMs,
        hasPriorSession: Boolean(sessionToken),
      },
    });

    setDraft("");
    setError(null);
    setIsSending(true);
    setMessages((previous) => [...previous, userMessage]);

    try {
      const result = await sendLandingAuditMessage({
        config: runtimeConfig,
        message: trimmed,
        sessionToken,
        language: activeLanguage,
      });

      const assistantMessage: LandingAuditMessage = {
        id: makeMessageId("assistant"),
        role: "assistant",
        content: result.assistantMessage,
        timestamp: Date.now(),
      };

      setSessionToken(result.sessionToken);
      setClaimToken(result.claimToken);
      persistLandingAuditTokens({
        sessionToken: result.sessionToken,
        claimToken: result.claimToken,
      });
      setMessages((previous) => [...previous, assistantMessage]);
    } catch (caughtError) {
      if (isDuplicateInboundAckError(caughtError)) {
        const duplicateAckMessage: LandingAuditMessage = {
          id: makeMessageId("assistant"),
          role: "assistant",
          content:
            activeLanguage === "de"
              ? "Nachricht erhalten. Wir machen mit Ihrem letzten Schritt weiter."
              : "Message received. Continuing from your latest step.",
          timestamp: Date.now(),
        };
        setMessages((previous) => [...previous, duplicateAckMessage]);
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Unable to send message.");
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  return (
    <div className="chat-container max-w-2xl mx-auto overflow-hidden" role="region" aria-label="Embedded audit chat">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Image
          src="/images/samantha-avatar.png"
          alt="Samantha"
          width={36}
          height={36}
          className="rounded-full"
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Samantha
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            {ui.subtitle}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={threadContainerRef}
        className="p-4 space-y-4 overflow-y-auto"
        style={{ maxHeight: "400px" }}
        aria-live="polite"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role === "assistant" && (
              <Image
                src="/images/samantha-avatar.png"
                alt="Samantha"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div
              className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                message.role === "assistant" ? "chat-message-assistant" : "chat-message-user"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="chat-message-rich">{renderAssistantContent(message.content)}</div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex gap-3">
            <Image
              src="/images/samantha-avatar.png"
              alt="Samantha"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="chat-message-assistant px-4 py-3">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: "var(--color-text-tertiary)", animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: "var(--color-text-tertiary)", animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: "var(--color-text-tertiary)", animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        className="p-4 flex gap-2"
        style={{ borderTop: "1px solid var(--color-border)" }}
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <input
          id="landing-audit-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={ui.placeholder}
          disabled={isSending}
          className="chat-input flex-1 px-3 py-2 text-base md:text-sm"
        />
        <button
          type="submit"
          disabled={isSending || draft.trim().length === 0}
          className="btn-accent px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          {ui.send}
        </button>
      </form>

      {error && (
        <p className="px-4 pb-3 text-sm font-medium" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
      {sessionToken && (
        <p className="px-4 pb-2 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
          Session active
        </p>
      )}
      {claimToken && (
        <p className="px-4 pb-2 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
          Claim token captured for handoff.
        </p>
      )}
    </div>
  );
}
