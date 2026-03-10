import { describe, expect, it } from "vitest";

import {
  buildOpenRouterMessages,
  shouldSuppressLatestUserImageAttachments,
} from "../../../convex/ai/chatRuntimeOrchestration";

describe("chat runtime orchestration", () => {
  it("keeps latest user image attachments enabled by default in persistent duplex mode", () => {
    expect(
      shouldSuppressLatestUserImageAttachments({
        sessionTransportPath: "persistent_realtime_multimodal",
        voiceSessionId: "voice_1",
      }),
    ).toBe(false);

    const messages = buildOpenRouterMessages({
      systemPrompt: "sys",
      conversationMessages: [
        {
          role: "user",
          content: "describe this",
          attachments: [{ kind: "image", url: "https://cdn.test/frame-1.jpg" }],
        },
      ],
      suppressLatestUserImageAttachments: false,
    });

    expect(Array.isArray(messages[1]?.content)).toBe(true);
  });

  it("suppresses only the latest user image attachment when explicit policy is requested", () => {
    expect(
      shouldSuppressLatestUserImageAttachments({
        sessionTransportPath: "persistent_realtime_multimodal",
        voiceSessionId: "voice_1",
        turnStitchAttachmentPolicy: "suppress_latest_user_image_attachments",
      }),
    ).toBe(true);

    const messages = buildOpenRouterMessages({
      systemPrompt: "sys",
      conversationMessages: [
        {
          role: "user",
          content: "first frame",
          attachments: [{ kind: "image", url: "https://cdn.test/frame-a.jpg" }],
        },
        {
          role: "assistant",
          content: "ack",
        },
        {
          role: "user",
          content: "latest frame",
          attachments: [{ kind: "image", url: "https://cdn.test/frame-b.jpg" }],
        },
      ],
      suppressLatestUserImageAttachments: true,
    });

    expect(Array.isArray(messages[1]?.content)).toBe(true);
    expect(messages[3]?.content).toBe("latest frame");
  });
});
