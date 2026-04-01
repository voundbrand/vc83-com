import { describe, expect, it } from "vitest";

import {
  buildInboundLanguageLockRuntimeContext,
  resolveInboundConversationLanguageLock,
} from "../../../convex/ai/agents/der_terminmacher/languageLock";
import {
  buildInboundLanguageLockRuntimeContext as buildInboundLanguageLockRuntimeContextFromAgentExecution,
  resolveInboundConversationLanguageLock as resolveInboundConversationLanguageLockFromAgentExecution,
} from "../../../convex/ai/kernel/agentExecution";

describe("Der Terminmacher language lock helpers", () => {
  it("prefers explicit conversation runtime language lock first", () => {
    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          conversationRuntime: {
            languageLock: "de-DE",
          },
          voiceRuntime: {
            languageLock: "en-US",
            language: "fr",
          },
          language: "hi",
        },
        inboundVoiceRequest: {
          language: "en",
        },
      }),
    ).toBe("de-de");
  });

  it("falls back to explicit voice runtime lock, then inbound request, then metadata hints", () => {
    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          voiceRuntime: {
            languageLock: "en-US",
            language: "de",
          },
          conversationRuntime: {
            language: "fr",
          },
          language: "hi",
          locale: "de-DE",
        },
        inboundVoiceRequest: {
          language: "es-ES",
        },
      }),
    ).toBe("en-us");

    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          voiceRuntime: {
            language: "de",
          },
          conversationRuntime: {
            language: "fr",
          },
        },
        inboundVoiceRequest: {
          language: "en-US",
        },
      }),
    ).toBe("en-us");

    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          voiceRuntime: {
            language: "de",
          },
          conversationRuntime: {
            language: "fr",
          },
          language: "english",
          locale: "hi",
        },
      }),
    ).toBe("de");
  });

  it("returns null when no valid language lock signal exists", () => {
    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          voiceRuntime: {
            language: "!!!",
          },
          locale: {},
        },
      }),
    ).toBeNull();
  });

  it("formats deterministic language-lock runtime context", () => {
    expect(buildInboundLanguageLockRuntimeContext("en-US")).toBe(
      [
        "--- LANGUAGE LOCK ---",
        "Conversation language lock: en-us.",
        "Default all replies to en-us and keep language stable across turns.",
        "Switch languages only when the user explicitly requests it.",
        "--- END LANGUAGE LOCK ---",
      ].join("\n"),
    );
    expect(buildInboundLanguageLockRuntimeContext("??")).toBeNull();
  });

  it("preserves backward-compatible exports via agentExecution", () => {
    expect(resolveInboundConversationLanguageLockFromAgentExecution).toBe(
      resolveInboundConversationLanguageLock,
    );
    expect(buildInboundLanguageLockRuntimeContextFromAgentExecution).toBe(
      buildInboundLanguageLockRuntimeContext,
    );
    expect(
      buildInboundLanguageLockRuntimeContextFromAgentExecution("de-DE"),
    ).toBe(buildInboundLanguageLockRuntimeContext("de-DE"));
  });
});
