import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeAudioTool } from "../../../convex/ai/tools/mediaTools";

describe("transcribeAudioTool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses shared audio transcription utility, returns success payload, and can save transcript file", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const runMutation = vi.fn().mockResolvedValue({
      fileId: "pf_1",
      path: "/voice-transcript.md",
      parentPath: "/",
      name: "voice-transcript.md",
      overwritten: false,
    });

    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://media.example/voice.ogg") {
        return new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: {
            "content-type": "audio/ogg",
            "content-length": "4",
          },
        });
      }
      if (url === "https://api.openai.com/v1/audio/transcriptions") {
        return new Response(
          JSON.stringify({
            text: "Shared utility transcript",
            language: "en",
            duration: 1.7,
            segments: [{ start: 0, end: 1.2, text: "Shared utility transcript" }],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }
        );
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await transcribeAudioTool.execute({
      runMutation,
      organizationId: "org_1",
      userId: "user_1",
    } as any, {
      audioUrl: "https://media.example/voice.ogg",
      saveToUserFiles: true,
      saveFileName: "voice-transcript.md",
    }) as Record<string, unknown>;

    expect(result.success).toBe(true);
    expect(result.text).toBe("Shared utility transcript");
    expect(result.language).toBe("en");
    expect(result.model).toBe("whisper-1");
    expect(result.segments).toBe(1);
    expect((result.transcriptFile as Record<string, unknown>).saved).toBe(true);
    expect((result.transcriptFile as Record<string, unknown>).path).toBe(
      "/voice-transcript.md"
    );
    expect(runMutation).toHaveBeenCalledTimes(1);
  });

  it("returns deterministic error code when API key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await transcribeAudioTool.execute({} as any, {
      audioUrl: "https://media.example/voice.ogg",
    }) as Record<string, unknown>;

    expect(result.success).toBe(false);
    expect(result.error).toBe("OPENAI_API_KEY_MISSING");
    expect(String(result.message)).toContain("not configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
