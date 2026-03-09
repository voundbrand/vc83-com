import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const NODE_REGISTRY_PATH = resolve(process.cwd(), "convex/layers/nodeRegistry.ts");
const BEHAVIOR_ADAPTER_PATH = resolve(process.cwd(), "convex/layers/behaviorAdapter.ts");

describe("layers youtube ingestion node contracts", () => {
  it("registers a native youtube transcript ingestion node in the layer registry", () => {
    const source = readFileSync(NODE_REGISTRY_PATH, "utf8");

    expect(source).toContain('type: "lc_youtube_transcript"');
    expect(source).toContain("LC YouTube Transcript");
    expect(source).toContain("Transcribe YouTube Video");
    expect(source).toContain('value: "transcribe_youtube_video"');
  });

  it("maps youtube ingestion node execution through transcribe_youtube_video tool", () => {
    const source = readFileSync(BEHAVIOR_ADAPTER_PATH, "utf8");

    expect(source).toContain("if (args.nodeType === \"lc_youtube_transcript\")");
    expect(source).toContain("executeTool(");
    expect(source).toContain("\"transcribe_youtube_video\"");
    expect(source).toContain("layers_lc_youtube_transcript");
    expect(source).toContain("youtubeTranscript");
  });
});
