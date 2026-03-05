import { afterEach, describe, expect, it } from "vitest";
import {
  ELEVENLABS_HARD_FALLBACK_VOICE_ID,
  resolveDeterministicOrgDefaultVoiceId,
  resolveDeterministicVoiceDefaults,
} from "../../../convex/ai/voiceDefaults";

const PLATFORM_ENV_KEY = "VOICE_RUNTIME_PLATFORM_DEFAULT_VOICE_ID";
const ELEVENLABS_ENV_KEY = "ELEVENLABS_DEFAULT_VOICE_ID";

function clearDefaultVoiceEnv() {
  delete process.env[PLATFORM_ENV_KEY];
  delete process.env[ELEVENLABS_ENV_KEY];
}

afterEach(() => {
  clearDefaultVoiceEnv();
});

describe("resolveDeterministicVoiceDefaults", () => {
  it("prefers requested voice id first", () => {
    const result = resolveDeterministicVoiceDefaults({
      requestedVoiceId: "voice_requested",
      agentVoiceId: "voice_agent",
      orgDefaultVoiceId: "voice_org",
      platformDefaultVoiceId: "voice_platform",
    });

    expect(result.resolvedVoiceId).toBe("voice_requested");
    expect(result.voiceResolutionSource).toBe("requested");
  });

  it("falls through to agent, org, and platform defaults with source labels", () => {
    const agentResult = resolveDeterministicVoiceDefaults({
      requestedVoiceId: null,
      agentVoiceId: "voice_agent",
      orgDefaultVoiceId: "voice_org",
      platformDefaultVoiceId: "voice_platform",
    });
    expect(agentResult.resolvedVoiceId).toBe("voice_agent");
    expect(agentResult.voiceResolutionSource).toBe("agent");

    const orgResult = resolveDeterministicVoiceDefaults({
      requestedVoiceId: null,
      agentVoiceId: null,
      orgDefaultVoiceId: "voice_org",
      platformDefaultVoiceId: "voice_platform",
    });
    expect(orgResult.resolvedVoiceId).toBe("voice_org");
    expect(orgResult.voiceResolutionSource).toBe("org_default");

    const platformResult = resolveDeterministicVoiceDefaults({
      requestedVoiceId: null,
      agentVoiceId: null,
      orgDefaultVoiceId: null,
      platformDefaultVoiceId: "voice_platform",
    });
    expect(platformResult.resolvedVoiceId).toBe("voice_platform");
    expect(platformResult.voiceResolutionSource).toBe("platform_default");
  });

  it("uses env platform default when explicit platform default is absent", () => {
    process.env[PLATFORM_ENV_KEY] = "voice_platform_env";

    const result = resolveDeterministicVoiceDefaults({
      requestedVoiceId: null,
      agentVoiceId: null,
      orgDefaultVoiceId: null,
    });

    expect(result.resolvedVoiceId).toBe("voice_platform_env");
    expect(result.voiceResolutionSource).toBe("platform_default");
  });

  it("returns hard fallback for null inputs", () => {
    clearDefaultVoiceEnv();

    const result = resolveDeterministicVoiceDefaults({
      requestedVoiceId: null,
      agentVoiceId: null,
      orgDefaultVoiceId: null,
      platformDefaultVoiceId: null,
    });

    expect(result.resolvedVoiceId).toBe(ELEVENLABS_HARD_FALLBACK_VOICE_ID);
    expect(result.voiceResolutionSource).toBe("hard_fallback");
  });

  it("resolves deterministic org default from platform env then hard fallback", () => {
    process.env[PLATFORM_ENV_KEY] = "voice_platform_env";
    expect(resolveDeterministicOrgDefaultVoiceId()).toBe("voice_platform_env");

    clearDefaultVoiceEnv();
    expect(resolveDeterministicOrgDefaultVoiceId()).toBe(
      ELEVENLABS_HARD_FALLBACK_VOICE_ID,
    );
  });
});
