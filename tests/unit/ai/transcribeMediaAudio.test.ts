import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OPENAI_MAX_AUDIO_BYTES,
  transcribeMediaAudio,
} from "../../../convex/ai/tools/shared/transcribeMediaAudio";

describe("transcribeMediaAudio", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("transcribes audio successfully with normalized mime and segments", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://media.example/clip.webm") {
        return new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: {
            "content-type": "audio/webm; codecs=opus",
            "content-length": "4",
          },
        });
      }
      if (url === "https://api.openai.com/v1/audio/transcriptions") {
        return new Response(
          JSON.stringify({
            text: " Hello   world ",
            language: "en",
            duration: 1.2,
            segments: [{ start: 0, end: 1.0, text: "Hello world" }],
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

    const result = await transcribeMediaAudio({
      audioUrl: "https://media.example/clip.webm",
      language: "en",
      timestamps: "segment",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.code).toBe("TRANSCRIPTION_SUCCESS");
      expect(result.text).toBe("Hello world");
      expect(result.detectedLanguage).toBe("en");
      expect(result.audioContentType).toBe("audio/webm");
      expect(result.segments).toHaveLength(1);
    }
  });

  it("returns deterministic missing API key failure", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await transcribeMediaAudio({
      audioUrl: "https://media.example/clip.webm",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("OPENAI_API_KEY_MISSING");
      expect(result.userMessage).toContain("OPENAI_API_KEY");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns oversize failure before uploading to OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const oversizedBytes = OPENAI_MAX_AUDIO_BYTES + 1;
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1]), {
        status: 200,
        headers: {
          "content-type": "audio/mp4",
          "content-length": String(oversizedBytes),
        },
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await transcribeMediaAudio({
      audioUrl: "https://media.example/large.m4a",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("AUDIO_TOO_LARGE");
      expect(result.userMessage).toContain("25MB");
    }
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns deterministic OpenAI failure details", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://media.example/clip.mp3") {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            "content-type": "audio/mpeg",
            "content-length": "3",
          },
        });
      }
      if (url === "https://api.openai.com/v1/audio/transcriptions") {
        return new Response("bad request", {
          status: 400,
          headers: { "content-type": "text/plain" },
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await transcribeMediaAudio({
      audioUrl: "https://media.example/clip.mp3",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("AUDIO_TRANSCRIPTION_FAILED");
      expect(result.statusCode).toBe(400);
      expect(result.userMessage).toContain("HTTP 400");
    }
  });
});
