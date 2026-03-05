import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function sectionBetween(source: string, startMarker: string, endMarker?: string): string {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end =
    endMarker === undefined ? source.length : source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("mobile voice mode hud contract", () => {
  it("maps every ConversationTurnState to deterministic orb visuals and labels", () => {
    const source = readWorkspaceFile(
      "apps/operator-mobile/src/components/chat/VoiceModeModal.tsx"
    );
    const mappingSection = sectionBetween(
      source,
      "const VOICE_MODE_TURN_VISUAL_STATE_MAP",
      "const VOICE_MODE_PRESTART_VISUAL_STATE"
    );

    expect(mappingSection).toContain("idle:");
    expect(mappingSection).toContain("listening:");
    expect(mappingSection).toContain("thinking:");
    expect(mappingSection).toContain("agent_speaking:");
    expect(mappingSection).toContain("label: 'IDLE'");
    expect(mappingSection).toContain("label: 'REC'");
    expect(mappingSection).toContain("label: 'WAIT'");
    expect(mappingSection).toContain("label: 'TALK'");
    expect(mappingSection).toContain("statusText: 'Live duplex ready'");
    expect(mappingSection).toContain("statusText: 'Listening...'");
    expect(mappingSection).toContain("statusText: 'Thinking...'");
    expect(mappingSection).toContain("statusText: 'Agent speaking...'");
  });

  it("removes boolean-derived visual branching from VoiceModeModal status/orb rendering", () => {
    const source = readWorkspaceFile(
      "apps/operator-mobile/src/components/chat/VoiceModeModal.tsx"
    );

    expect(source).toContain("const statusText = voiceModeVisualState.statusText;");
    expect(source).toContain("label: voiceModeVisualState.label");
    expect(source).toContain("background: voiceModeVisualState.background");
    expect(source).not.toContain("if (isTurnListening)");
    expect(source).not.toContain("if (isTurnThinking)");
    expect(source).not.toContain("if (isTurnAgentSpeaking)");
    expect(source).not.toContain("liveDuplexEnabled ? 'Streaming...' : 'Listening...'");
    expect(source).not.toContain("liveDuplexEnabled ? 'Live duplex ready' : 'Tap to talk'");
  });

  it("keeps index HUD labels deterministic via turn-state and mobile source mappings", () => {
    const source = readWorkspaceFile(
      "apps/operator-mobile/app/(tabs)/index.tsx"
    );
    const turnLabelSection = sectionBetween(
      source,
      "const MOBILE_CONVERSATION_TURN_HUD_LABELS",
      "function resolveMobileConversationTurnHudLabel"
    );
    const sourceLabelSection = sectionBetween(
      source,
      "function resolveMobileConversationSourceHudLabel",
      "export default function ConversationScreen()"
    );

    expect(turnLabelSection).toContain("idle: 'IDLE'");
    expect(turnLabelSection).toContain("listening: 'LISTENING'");
    expect(turnLabelSection).toContain("thinking: 'THINKING'");
    expect(turnLabelSection).toContain("agent_speaking: 'AGENT SPEAKING'");
    expect(sourceLabelSection).toContain("sourceMode === 'meta_glasses' ? 'meta_glasses' : 'iphone'");
    expect(source).toContain("Turn {liveTurnHudLabel}");
    expect(source).toContain("source:{liveHudSourceLabel}");
    expect(source).not.toContain("'webcam'");
  });
});
