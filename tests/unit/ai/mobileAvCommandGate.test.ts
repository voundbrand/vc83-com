import { describe, expect, it } from "vitest";
import { createNodeCommandGatePolicy, evaluateNodeCommandGate } from "../../../apps/operator-mobile/src/lib/av/command-gate";
import { createMobileAvSourceRegistry } from "../../../apps/operator-mobile/src/lib/av/source-registry";

describe("mobile AV source registry and command gate", () => {
  it("registers explicit sources with normalized deterministic IDs", () => {
    const registry = createMobileAvSourceRegistry({ now: () => 1_700_000_000_000 });
    const source = registry.registerSource({
      sourceClass: "iphone_camera",
      providerId: "iOS AV Foundation",
      deviceLabel: "Primary Camera",
      transport: "native",
      capabilities: { camera: true },
    });

    expect(source.sourceId).toBe("iphone_camera:ios_av_foundation:primary_camera");
    expect(source.providerId).toBe("ios_av_foundation");
    expect(source.registeredAt).toBe(1_700_000_000_000);
    expect(registry.requireSource(source.sourceId)).toMatchObject({
      sourceId: "iphone_camera:ios_av_foundation:primary_camera",
    });
  });

  it("fails closed when command source is unknown", () => {
    const registry = createMobileAvSourceRegistry();
    const policy = createNodeCommandGatePolicy({
      allowlistCsv: "capture_frame,capture_audio,transcribe_audio",
      blockedPatternsCsv: "sudo,rm ",
    });

    const decision = evaluateNodeCommandGate({
      command: "capture_frame",
      sourceId: "missing_source",
      sourceRegistry: registry,
      policy,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("source_not_registered");
  });

  it("fails closed when command source id is missing", () => {
    const registry = createMobileAvSourceRegistry();
    const policy = createNodeCommandGatePolicy({
      allowlistCsv: "capture_frame,capture_audio,transcribe_audio",
      blockedPatternsCsv: "sudo,rm ",
    });

    const decision = evaluateNodeCommandGate({
      command: "capture_frame",
      sourceRegistry: registry,
      policy,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("source_id_required");
  });

  it("fails closed for non-allowlisted commands even with a registered source", () => {
    const registry = createMobileAvSourceRegistry();
    const source = registry.registerSource({
      sourceClass: "iphone_microphone",
      providerId: "ios_avfoundation",
      deviceLabel: "primary_mic",
      transport: "native",
      capabilities: { microphone: true },
    });
    const policy = createNodeCommandGatePolicy({
      allowlistCsv: "capture_frame,capture_audio,transcribe_audio",
      blockedPatternsCsv: "sudo,rm ",
    });

    const decision = evaluateNodeCommandGate({
      command: "execute_meeting_concierge",
      sourceId: source.sourceId,
      sourceRegistry: registry,
      policy,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("command_not_allowlisted");
  });

  it("fails closed when command route does not allow source capability", () => {
    const registry = createMobileAvSourceRegistry();
    const source = registry.registerSource({
      sourceClass: "iphone_camera",
      providerId: "ios_avfoundation",
      deviceLabel: "primary_camera",
      transport: "native",
      capabilities: { camera: true },
    });
    const policy = createNodeCommandGatePolicy({
      allowlistCsv: "transcribe_audio",
      blockedPatternsCsv: "sudo,rm ",
    });

    const decision = evaluateNodeCommandGate({
      command: "transcribe_audio",
      sourceId: source.sourceId,
      sourceRegistry: registry,
      policy,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("source_class_not_allowed:iphone_camera");
  });

  it("fails closed on source scope mismatch", () => {
    const registry = createMobileAvSourceRegistry();
    const source = registry.registerSource({
      sourceClass: "iphone_microphone",
      providerId: "ios_avfoundation",
      deviceLabel: "primary_mic",
      transport: "native",
      scope: { organizationId: "org_123" },
      capabilities: { microphone: true },
    });
    const policy = createNodeCommandGatePolicy({
      allowlistCsv: "transcribe_audio",
      blockedPatternsCsv: "sudo,rm ",
    });

    const decision = evaluateNodeCommandGate({
      command: "transcribe_audio",
      sourceId: source.sourceId,
      expectedScope: { organizationId: "org_999" },
      sourceRegistry: registry,
      policy,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("source_scope_mismatch");
  });

  it("blocks unsafe command patterns before allowlist evaluation", () => {
    const registry = createMobileAvSourceRegistry();
    const source = registry.registerSource({
      sourceClass: "uploaded_media",
      providerId: "ios_avfoundation",
      deviceLabel: "upload_queue",
      transport: "native",
      capabilities: {},
    });
    const policy = createNodeCommandGatePolicy({
      allowlistCsv: "capture_frame,sudo reboot",
      blockedPatternsCsv: "sudo,rm ",
    });

    const decision = evaluateNodeCommandGate({
      command: "sudo reboot",
      sourceId: source.sourceId,
      sourceRegistry: registry,
      policy,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("unsafe_command_pattern");
  });
});
