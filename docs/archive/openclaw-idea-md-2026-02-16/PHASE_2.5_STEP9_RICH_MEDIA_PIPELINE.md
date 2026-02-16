# Phase 2.5 Step 9: Rich Media Pipeline — Emergent Tool Composition

## Goal
Agents can handle **non-text messages** — voice notes, images, documents, videos — by composing API tools at runtime. Instead of hardcoding "if audio → call transcription," we give agents a toolkit and let them **figure out how** to handle each media type. This is the path toward the emergent behavior Peter described: an agent that independently built audio transcription when it received a voice note.

## Depends On
- Step 7 (Soul Evolution) — agent can propose "I should handle voice notes" as a soul update
- Step 8 (Telegram Group) — rich media from customer channels mirrors to the group
- Working channel types (`NormalizedInboundMessage` already supports `messageType: "image" | "audio" | "video" | "file"`)

## Inspiration

From the Lex Fridman interview:
> When sent an audio message, the agent *independently*:
> 1. Converted the file format
> 2. Detected opus codec from headers
> 3. Found the OpenAI API key in its environment
> 4. Used curl to transcribe via external service

The key enabler: the agent had **tool access** + **self-awareness** (harness told it what APIs were available). It composed a solution from primitives. We replicate this pattern with sandboxed API tools instead of raw shell access.

## Architecture

```
Customer sends voice note via WhatsApp
    │
    ▼
Channel provider normalizes → { messageType: "audio", attachments: [{ url, type }] }
    │
    ▼
processInboundMessage detects non-text content
    │
    ▼
Agent receives message with media context:
  "User sent an audio message (ogg/opus, 15 seconds).
   Available media tools: transcribe_audio, analyze_image, parse_document.
   Use the appropriate tool to process this content, then respond."
    │
    ▼
Agent calls transcribe_audio tool → gets text
    │
    ▼
Agent responds to the customer with the transcribed content context
```

### The "Emergent" Part

The agent isn't following a hardcoded flow. It reads its tool list, understands what each tool does, and **chooses** the right composition. If someone sends an image of a handwritten note:
1. Agent sees `analyze_image` tool → calls it to get a description
2. Realizes it's handwritten text → checks if `parse_document` can handle OCR
3. Composes both tools to extract the text and respond

We don't program this flow. The agent discovers it.

## Changes

### 1. NEW: convex/ai/tools/mediaTools.ts

```typescript
/**
 * MEDIA PROCESSING TOOLS
 *
 * Sandboxed API tools for handling rich media.
 * Agents discover and compose these based on incoming content.
 *
 * Design principle: Each tool does ONE thing well.
 * The agent composes them for complex scenarios.
 */

import type { AITool, ToolExecutionContext } from "./registry";

let _apiCache: any = null;
function getInternal(): any {
  if (!_apiCache) _apiCache = require("../../_generated/api").internal;
  return _apiCache;
}

// ============================================================================
// AUDIO TRANSCRIPTION
// ============================================================================

export const transcribeAudioTool: AITool = {
  name: "transcribe_audio",
  description: `Transcribe an audio file to text. Supports voice notes (ogg/opus), MP3, WAV, M4A, and WEBM.

Use this when:
- A customer sends a voice note or audio message
- You receive an audio attachment and need to understand what was said
- You need to process a voice recording

Returns the transcribed text and detected language.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      audioUrl: {
        type: "string",
        description: "URL of the audio file to transcribe. Get this from the message attachments.",
      },
      language: {
        type: "string",
        description: "Expected language (ISO 639-1 code, e.g., 'en', 'de', 'es'). Optional — auto-detected if omitted.",
      },
    },
    required: ["audioUrl"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, string>) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return { error: "Audio transcription not configured (no OpenAI API key). Tell the user you can't process audio yet." };
    }

    try {
      // 1. Download the audio file
      const audioResponse = await fetch(args.audioUrl);
      if (!audioResponse.ok) {
        return { error: `Failed to download audio: ${audioResponse.status}` };
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const contentType = audioResponse.headers.get("content-type") || "audio/ogg";

      // Determine file extension from content type
      const extMap: Record<string, string> = {
        "audio/ogg": "ogg",
        "audio/opus": "ogg",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/mp4": "m4a",
        "audio/m4a": "m4a",
        "audio/webm": "webm",
      };
      const ext = extMap[contentType] || "ogg";

      // 2. Call OpenAI Whisper API
      const formData = new FormData();
      formData.append("file", new Blob([audioBuffer], { type: contentType }), `audio.${ext}`);
      formData.append("model", "whisper-1");
      if (args.language) {
        formData.append("language", args.language);
      }
      formData.append("response_format", "verbose_json");

      const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        return { error: `Transcription failed: ${errorText}` };
      }

      const result = await transcriptionResponse.json();

      return {
        success: true,
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments?.length || 0,
      };
    } catch (error: any) {
      return { error: `Transcription error: ${error.message}` };
    }
  },
};

// ============================================================================
// IMAGE ANALYSIS
// ============================================================================

export const analyzeImageTool: AITool = {
  name: "analyze_image",
  description: `Analyze an image using vision AI. Can describe what's in the image, read text (OCR), identify products, analyze screenshots, and more.

Use this when:
- A customer sends a photo or screenshot
- You receive an image attachment (receipt, product photo, document scan)
- You need to understand visual content to respond appropriately

The analysis is context-aware — describe what you need to know in the prompt.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      imageUrl: {
        type: "string",
        description: "URL of the image to analyze. Get this from the message attachments.",
      },
      analysisPrompt: {
        type: "string",
        description: "What to look for in the image. Be specific. Examples: 'Describe this product', 'Read the text in this receipt', 'What does this screenshot show?'",
      },
    },
    required: ["imageUrl", "analysisPrompt"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, string>) => {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return { error: "Image analysis not configured. Tell the user you can't process images yet." };
    }

    try {
      // Use a vision-capable model via OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4.5",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: args.analysisPrompt,
                },
                {
                  type: "image_url",
                  image_url: { url: args.imageUrl },
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Image analysis failed: ${errorText}` };
      }

      const result = await response.json();
      const analysis = result.choices?.[0]?.message?.content || "Could not analyze image.";

      return {
        success: true,
        analysis,
        model: "claude-sonnet-4.5",
      };
    } catch (error: any) {
      return { error: `Image analysis error: ${error.message}` };
    }
  },
};

// ============================================================================
// DOCUMENT PARSING
// ============================================================================

export const parseDocumentTool: AITool = {
  name: "parse_document",
  description: `Parse a document (PDF, DOCX, or text file) and extract its content. Can handle invoices, contracts, forms, price lists, etc.

Use this when:
- A customer sends a document attachment
- You need to read a PDF, Word doc, or text file
- You need to extract structured data from a document

Returns the extracted text content and basic metadata.`,
  status: "beta",
  parameters: {
    type: "object",
    properties: {
      documentUrl: {
        type: "string",
        description: "URL of the document to parse.",
      },
      extractionGoal: {
        type: "string",
        description: "What information to extract. E.g., 'Get all line items and totals', 'Extract the contract terms', 'List all names and dates'.",
      },
    },
    required: ["documentUrl"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, string>) => {
    try {
      // 1. Download the document
      const docResponse = await fetch(args.documentUrl);
      if (!docResponse.ok) {
        return { error: `Failed to download document: ${docResponse.status}` };
      }

      const contentType = docResponse.headers.get("content-type") || "";
      const buffer = await docResponse.arrayBuffer();

      // 2. Handle based on type
      if (contentType.includes("text/") || contentType.includes("application/json")) {
        // Plain text / JSON — read directly
        const text = new TextDecoder().decode(buffer);
        return {
          success: true,
          type: "text",
          content: text.slice(0, 10000), // Limit to prevent context overflow
          charCount: text.length,
        };
      }

      if (contentType.includes("pdf")) {
        // PDF — use vision model to read it (image-based OCR approach)
        // Convert first page(s) to image via API or use text extraction
        // For now, use the image analysis path as a fallback
        return {
          success: false,
          message: "PDF parsing requires additional setup. You can try asking the customer to copy-paste the relevant text, or use analyze_image if they send a screenshot of the document.",
          suggestion: "Use analyze_image on a screenshot of the document for now.",
        };
      }

      return {
        success: false,
        message: `Document type '${contentType}' not yet supported. Ask the customer to send as text or screenshot.`,
      };
    } catch (error: any) {
      return { error: `Document parsing error: ${error.message}` };
    }
  },
};

// ============================================================================
// MEDIA DOWNLOAD (utility for other tools)
// ============================================================================

export const downloadMediaTool: AITool = {
  name: "download_media",
  description: `Download a media file from a URL and get metadata about it. Use this to inspect a file before processing it with a specialized tool.

Returns: file size, content type, duration (for audio/video), dimensions (for images).

This is a utility — use it when you need to understand what kind of media you're dealing with before choosing how to process it.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      mediaUrl: {
        type: "string",
        description: "URL of the media file to inspect.",
      },
    },
    required: ["mediaUrl"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, string>) => {
    try {
      // HEAD request to get metadata without downloading full file
      const headResponse = await fetch(args.mediaUrl, { method: "HEAD" });

      if (!headResponse.ok) {
        return { error: `Could not access media: ${headResponse.status}` };
      }

      const contentType = headResponse.headers.get("content-type") || "unknown";
      const contentLength = headResponse.headers.get("content-length");
      const sizeBytes = contentLength ? parseInt(contentLength, 10) : null;
      const sizeMB = sizeBytes ? (sizeBytes / (1024 * 1024)).toFixed(2) : "unknown";

      // Categorize
      let category = "unknown";
      if (contentType.startsWith("image/")) category = "image";
      else if (contentType.startsWith("audio/")) category = "audio";
      else if (contentType.startsWith("video/")) category = "video";
      else if (contentType.includes("pdf")) category = "document";
      else if (contentType.includes("text/")) category = "text";
      else if (contentType.includes("application/")) category = "document";

      // Suggest tools
      const toolSuggestions: Record<string, string> = {
        image: "Use `analyze_image` to understand the image content",
        audio: "Use `transcribe_audio` to convert speech to text",
        video: "Video processing not yet available. Ask the customer to describe the content or send a screenshot.",
        document: "Use `parse_document` to extract text content",
        text: "Use `parse_document` to read the text file",
        unknown: "Inspect the content type and choose the appropriate tool",
      };

      return {
        success: true,
        contentType,
        category,
        sizeMB: `${sizeMB} MB`,
        sizeBytes,
        suggestedTool: toolSuggestions[category],
      };
    } catch (error: any) {
      return { error: `Media inspection error: ${error.message}` };
    }
  },
};
```

### 2. convex/ai/tools/registry.ts — Register media tools

```typescript
import {
  transcribeAudioTool,
  analyzeImageTool,
  parseDocumentTool,
  downloadMediaTool,
} from "./mediaTools";

// In TOOL_REGISTRY:
transcribe_audio: transcribeAudioTool,
analyze_image: analyzeImageTool,
parse_document: parseDocumentTool,
download_media: downloadMediaTool,
```

### 3. convex/ai/agentExecution.ts — Rich media context in system prompt

When a message has attachments, inject media context so the agent knows what tools to use:

```typescript
// After loading message and before building system prompt:

let mediaContext = "";
if (args.metadata?.attachments?.length) {
  const attachments = args.metadata.attachments;
  mediaContext = "\n\n=== MEDIA ATTACHMENTS ===\n";
  mediaContext += `The user sent ${attachments.length} attachment(s) along with their message.\n\n`;

  for (const att of attachments) {
    const typeMap: Record<string, string> = {
      "audio/ogg": "Voice note (OGG/Opus)",
      "audio/opus": "Voice note (Opus)",
      "audio/mpeg": "Audio file (MP3)",
      "audio/mp3": "Audio file (MP3)",
      "audio/wav": "Audio file (WAV)",
      "image/jpeg": "Photo (JPEG)",
      "image/png": "Image (PNG)",
      "image/webp": "Image (WebP)",
      "video/mp4": "Video (MP4)",
      "application/pdf": "Document (PDF)",
    };
    const typeLabel = typeMap[att.type] || `File (${att.type})`;
    mediaContext += `- ${typeLabel}: ${att.url}\n`;
    if (att.name) mediaContext += `  Filename: ${att.name}\n`;
  }

  mediaContext += `\nUse your media tools to process these attachments before responding.\n`;
  mediaContext += `Available: transcribe_audio, analyze_image, parse_document, download_media\n`;
  mediaContext += "=== END MEDIA ===\n";
}

// Append mediaContext to the user message or system prompt
```

### 4. convex/channels/providers/telegramProvider.ts — Extract attachments

Enhance the Telegram normalizer to pass through attachment metadata:

```typescript
// In normalizeInbound, after extracting text:

// Handle media attachments
const attachments: Array<{ type: string; url: string; name?: string }> = [];

if (rawPayload.message?.voice) {
  const voice = rawPayload.message.voice;
  const fileUrl = await getTelegramFileUrl(credentials.telegramBotToken!, voice.file_id);
  if (fileUrl) {
    attachments.push({
      type: voice.mime_type || "audio/ogg",
      url: fileUrl,
      name: `voice_${voice.duration}s`,
    });
  }
}

if (rawPayload.message?.photo) {
  // Telegram sends multiple sizes — take the largest
  const photos = rawPayload.message.photo;
  const largest = photos[photos.length - 1];
  const fileUrl = await getTelegramFileUrl(credentials.telegramBotToken!, largest.file_id);
  if (fileUrl) {
    attachments.push({
      type: "image/jpeg",
      url: fileUrl,
    });
  }
}

if (rawPayload.message?.document) {
  const doc = rawPayload.message.document;
  const fileUrl = await getTelegramFileUrl(credentials.telegramBotToken!, doc.file_id);
  if (fileUrl) {
    attachments.push({
      type: doc.mime_type || "application/octet-stream",
      url: fileUrl,
      name: doc.file_name,
    });
  }
}

if (rawPayload.message?.audio) {
  const audio = rawPayload.message.audio;
  const fileUrl = await getTelegramFileUrl(credentials.telegramBotToken!, audio.file_id);
  if (fileUrl) {
    attachments.push({
      type: audio.mime_type || "audio/mpeg",
      url: fileUrl,
      name: audio.file_name || audio.title,
    });
  }
}

// Helper: resolve Telegram file_id to download URL
async function getTelegramFileUrl(botToken: string, fileId: string): Promise<string | null> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (data.ok && data.result?.file_path) {
    return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
  }
  return null;
}
```

### 5. convex/ai/harness.ts — Media tools in self-awareness

Add media tool awareness to the harness:

```typescript
// After listing available tools, add media tool guidance:

const mediaToolNames = ["transcribe_audio", "analyze_image", "parse_document", "download_media"];
const availableMediaTools = filteredToolNames?.filter(t => mediaToolNames.includes(t)) || [];

if (availableMediaTools.length > 0) {
  lines.push("\n**Media handling:**");
  lines.push("You can process rich media (voice notes, images, documents) using your media tools.");
  lines.push("When a message includes attachments:");
  lines.push("  1. Check what type of media it is (the attachment metadata tells you)");
  lines.push("  2. Choose the right tool (transcribe_audio for voice, analyze_image for photos, etc.)");
  lines.push("  3. Process the media, then respond using the extracted content");
  lines.push("  4. If you're unsure about a file, use download_media to inspect it first");
  lines.push("Don't tell the user you can't handle media — try your tools first.");
}
```

### 6. .env.local — Add OpenAI key for Whisper

```bash
# For audio transcription (Whisper API)
OPENAI_API_KEY=sk-...
```

## The Emergent Behavior Path

This step provides the **toolkit**. The emergence comes from:

1. **Agent sees a voice note** → Checks tool list → Finds `transcribe_audio` → Calls it → Responds
2. **Agent sees a photo of a menu** → Calls `analyze_image` with "Read all items and prices" → Responds with structured list
3. **Agent sees a PDF invoice** → Tries `parse_document` → It returns "use screenshot approach" → Agent asks customer to screenshot → Calls `analyze_image` → Extracts data

None of these flows are hardcoded. The agent composes from primitives.

### Future: Dynamic Tool Discovery

The next evolution (Phase 3+) would be agents that can **request new tools**:

```
Agent: "A customer sent a .xlsx file. I don't have a spreadsheet
  parser tool. Can you add one?"
  [propose_tool_addition: "parse_spreadsheet"]
```

This connects Step 7 (Soul Evolution) with tool composition — the agent evolves not just its personality but its capabilities.

## Verification
1. `npx convex typecheck` — passes
2. Send a voice note via Telegram → agent transcribes and responds
3. Send a photo via Telegram → agent describes and responds contextually
4. Send a document → agent attempts to parse, falls back gracefully
5. Send an unknown file type → agent uses `download_media` to inspect, then chooses
6. Verify media context appears in system prompt (check Convex logs)
7. Verify `OPENAI_API_KEY` is present for Whisper

## Complexity: Medium
- 1 new file (`mediaTools.ts`)
- 4 modified files (`registry.ts`, `agentExecution.ts`, `telegramProvider.ts`, `harness.ts`)
- 1 env variable addition

## Cost Considerations
- **Whisper API:** ~$0.006 per minute of audio. A 30-second voice note costs ~$0.003.
- **Vision (Claude):** ~$0.003-0.01 per image analysis via OpenRouter.
- **Total per media message:** typically under $0.02 — well within credit system budget.
- Media processing credits can be tracked in the existing credit system.

## Security Considerations
- All media URLs are from trusted channel providers (Telegram API, WhatsApp API)
- File sizes are bounded by provider limits (Telegram: 20MB, WhatsApp: 16MB)
- OpenAI/OpenRouter API keys are server-side only (never exposed to client)
- No arbitrary code execution — tools are sandboxed API calls
- Document parsing is limited to safe content extraction (no macro execution)
