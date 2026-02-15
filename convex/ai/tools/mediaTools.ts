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
  execute: async (_ctx: ToolExecutionContext, args: Record<string, string>) => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await transcriptionResponse.json() as any;

      return {
        success: true,
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments?.length || 0,
      };
    } catch (error: unknown) {
      return { error: `Transcription error: ${error instanceof Error ? error.message : String(error)}` };
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
  execute: async (_ctx: ToolExecutionContext, args: Record<string, string>) => {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return { error: "Image analysis not configured. Tell the user you can't process images yet." };
    }

    try {
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
                { type: "text", text: args.analysisPrompt },
                { type: "image_url", image_url: { url: args.imageUrl } },
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await response.json() as any;
      const analysis = result.choices?.[0]?.message?.content || "Could not analyze image.";

      return {
        success: true,
        analysis,
        model: "claude-sonnet-4.5",
      };
    } catch (error: unknown) {
      return { error: `Image analysis error: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};

// ============================================================================
// DOCUMENT PARSING
// ============================================================================

export const parseDocumentTool: AITool = {
  name: "parse_document",
  description: `Parse a document (PDF, DOCX, or text file) and extract its content.

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
        description: "What information to extract. E.g., 'Get all line items and totals', 'Extract the contract terms'.",
      },
    },
    required: ["documentUrl"],
  },
  execute: async (_ctx: ToolExecutionContext, args: Record<string, string>) => {
    try {
      const docResponse = await fetch(args.documentUrl);
      if (!docResponse.ok) {
        return { error: `Failed to download document: ${docResponse.status}` };
      }

      const contentType = docResponse.headers.get("content-type") || "";
      const buffer = await docResponse.arrayBuffer();

      if (contentType.includes("text/") || contentType.includes("application/json")) {
        const text = new TextDecoder().decode(buffer);
        return {
          success: true,
          type: "text",
          content: text.slice(0, 10000),
          charCount: text.length,
        };
      }

      if (contentType.includes("pdf")) {
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
    } catch (error: unknown) {
      return { error: `Document parsing error: ${error instanceof Error ? error.message : String(error)}` };
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
  execute: async (_ctx: ToolExecutionContext, args: Record<string, string>) => {
    try {
      const headResponse = await fetch(args.mediaUrl, { method: "HEAD" });

      if (!headResponse.ok) {
        return { error: `Could not access media: ${headResponse.status}` };
      }

      const contentType = headResponse.headers.get("content-type") || "unknown";
      const contentLength = headResponse.headers.get("content-length");
      const sizeBytes = contentLength ? parseInt(contentLength, 10) : null;
      const sizeMB = sizeBytes ? (sizeBytes / (1024 * 1024)).toFixed(2) : "unknown";

      let category = "unknown";
      if (contentType.startsWith("image/")) category = "image";
      else if (contentType.startsWith("audio/")) category = "audio";
      else if (contentType.startsWith("video/")) category = "video";
      else if (contentType.includes("pdf")) category = "document";
      else if (contentType.includes("text/")) category = "text";
      else if (contentType.includes("application/")) category = "document";

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
    } catch (error: unknown) {
      return { error: `Media inspection error: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
