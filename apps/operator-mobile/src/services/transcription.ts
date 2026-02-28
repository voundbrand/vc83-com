/**
 * Speech-to-text transcription service
 * Uses Groq Whisper API (free, fast) or OpenAI Whisper
 *
 * React Native compatible - uses file URI directly with FormData
 */

type TranscriptionResult = {
  text: string;
  success: boolean;
  error?: string;
};

/**
 * Transcribe audio file to text using Whisper API
 */
export async function transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
  try {
    // Get file extension for mime type
    const extension = audioUri.split('.').pop()?.toLowerCase() || 'm4a';
    const mimeType = getMimeType(extension);
    const fileName = `audio.${extension}`;

    // Try Groq's Whisper first (free, fast)
    const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    if (groqKey) {
      return await transcribeWithGroq(audioUri, mimeType, fileName, groqKey);
    }

    // Fallback to OpenAI Whisper
    const openAIKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (openAIKey) {
      return await transcribeWithOpenAI(audioUri, mimeType, fileName, openAIKey);
    }

    // No API key available
    return {
      text: '',
      success: false,
      error: 'No transcription API key configured. Add EXPO_PUBLIC_GROQ_API_KEY or EXPO_PUBLIC_OPENAI_API_KEY to your .env file.',
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio',
    };
  }
}

/**
 * Transcribe using Groq Whisper API (free, fast)
 */
async function transcribeWithGroq(
  audioUri: string,
  mimeType: string,
  fileName: string,
  apiKey: string
): Promise<TranscriptionResult> {
  // React Native FormData accepts file URI directly
  const formData = new FormData();
  const filePart = {
    uri: audioUri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob;
  formData.append('file', filePart);
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error response:', errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return {
    text: result.text?.trim() || '',
    success: true,
  };
}

/**
 * Transcribe using OpenAI Whisper API
 */
async function transcribeWithOpenAI(
  audioUri: string,
  mimeType: string,
  fileName: string,
  apiKey: string
): Promise<TranscriptionResult> {
  // React Native FormData accepts file URI directly
  const formData = new FormData();
  const filePart = {
    uri: audioUri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob;
  formData.append('file', filePart);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error response:', errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return {
    text: result.text?.trim() || '',
    success: true,
  };
}

/**
 * Get MIME type for audio extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'm4a': 'audio/m4a',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'mp4': 'audio/mp4',
    'mpeg': 'audio/mpeg',
    'mpga': 'audio/mpeg',
    'oga': 'audio/ogg',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'caf': 'audio/x-caf',
  };

  return mimeTypes[extension] || 'audio/m4a';
}
