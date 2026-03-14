import { NextResponse } from "next/server";
import {
  getLandingVoiceIntroFilename,
  getLandingVoiceIntroScript,
  getLandingVoiceIntroVoiceId,
  isLandingVoiceIntroAgentKey,
  normalizeLandingVoiceIntroLanguage,
} from "@/lib/landing-voice-intros";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return ELEVENLABS_BASE_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentKeyParam = url.searchParams.get("agentKey")?.trim().toLowerCase();
  const language = normalizeLandingVoiceIntroLanguage(
    url.searchParams.get("language"),
  );

  if (!agentKeyParam || !isLandingVoiceIntroAgentKey(agentKeyParam)) {
    return NextResponse.json({ error: "Unsupported agent key." }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = getLandingVoiceIntroVoiceId(agentKeyParam);
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key is not configured." },
      { status: 503 },
    );
  }
  if (!voiceId) {
    return NextResponse.json(
      { error: `Voice intro is not configured for ${agentKeyParam}.` },
      { status: 503 },
    );
  }

  const baseUrl = normalizeBaseUrl(process.env.ELEVENLABS_BASE_URL);
  const modelId =
    process.env.LANDING_VOICE_INTRO_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const text = getLandingVoiceIntroScript(agentKeyParam, language);

  try {
    const response = await fetch(
      `${baseUrl}/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        {
          error:
            errorBody.trim() || `ElevenLabs TTS failed with ${response.status}.`,
        },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
        "Content-Disposition": `inline; filename="${getLandingVoiceIntroFilename({
          agentKey: agentKeyParam,
          language,
        })}"`,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate voice intro.",
      },
      { status: 502 },
    );
  }
}
