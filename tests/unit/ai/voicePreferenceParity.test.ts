import { describe, expect, it } from "vitest";

import {
  buildPrimaryAgentVoiceSyncUpdates,
  resolveVoiceCatalogSelection,
} from "../../../convex/api/v1/aiChat";

describe("voice preference parity helpers", () => {
  it("prefers user voice and language selections over agent soul defaults", () => {
    const selection = resolveVoiceCatalogSelection({
      preferences: {
        voiceRuntimeVoiceId: "voice_user_1",
        language: "de-DE",
      },
      primaryAgent: {
        customProperties: {
          elevenLabsVoiceId: "voice_agent_1",
          voiceLanguage: "en",
        },
      },
    });

    expect(selection).toEqual({
      selectedVoiceId: "voice_user_1",
      selectedLanguage: "de",
      selectedVoiceSource: "user_preferences",
      selectedLanguageSource: "user_preferences",
    });
  });

  it("falls back to agent soul voice when user voice preference is empty", () => {
    const selection = resolveVoiceCatalogSelection({
      preferences: {
        voiceRuntimeVoiceId: "",
        language: "",
      },
      primaryAgent: {
        customProperties: {
          elevenLabsVoiceId: "voice_agent_2",
          voiceLanguage: "de",
        },
      },
    });

    expect(selection).toEqual({
      selectedVoiceId: "voice_agent_2",
      selectedLanguage: "de",
      selectedVoiceSource: "agent_soul",
      selectedLanguageSource: "agent_soul",
    });
  });

  it("builds sync payload with deterministic language normalization", () => {
    expect(
      buildPrimaryAgentVoiceSyncUpdates({
        agentVoiceId: "voice_new_1",
        language: "de-DE",
      }),
    ).toEqual({
      elevenLabsVoiceId: "voice_new_1",
      voiceLanguage: "de",
    });
  });

  it("clears agent soul voice id when user resets to default", () => {
    expect(
      buildPrimaryAgentVoiceSyncUpdates({
        agentVoiceId: null,
      }),
    ).toEqual({
      elevenLabsVoiceId: "",
    });
  });
});

