/**
 * Environment configuration
 *
 * Uses Expo's environment variable system with fallbacks
 */

// Keep this in sync with app.json -> expo.ios.infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes
// so Google callback routing works in local/dev builds.
const GOOGLE_IOS_CLIENT_ID_FALLBACK =
  '19450024372-6c594u7djuj6kb0no2bfac9ibmbd0s9a.apps.googleusercontent.com';

export const ENV = {
  // L4yercak3 API
  L4YERCAK3_API_URL: process.env.EXPO_PUBLIC_L4YERCAK3_API_URL || 'https://agreeable-lion-828.convex.site',
  L4YERCAK3_ORGANIZATION_ID: process.env.EXPO_PUBLIC_L4YERCAK3_ORGANIZATION_ID || '',

  // OAuth - Google
  // iOS Client ID from Google Cloud Console (OAuth 2.0 Client ID of type iOS)
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || GOOGLE_IOS_CLIENT_ID_FALLBACK,
  // Web Client ID (optional, for backend verification)
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',

  // OAuth - GitHub
  GITHUB_CLIENT_ID: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '',

  // OAuth - Microsoft (Azure AD / Entra ID)
  MICROSOFT_CLIENT_ID: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '',
  MICROSOFT_TENANT_ID: process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common', // 'common' for multi-tenant

  // OpenRouter (LLM)
  OPENROUTER_API_KEY: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '',
  OPENROUTER_DEFAULT_MODEL: process.env.EXPO_PUBLIC_OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-4.5-sonnet',

  // ElevenLabs (TTS)
  ELEVENLABS_API_KEY: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '',
  ELEVENLABS_VOICE_ID: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || '',

  // Speech-to-Text (Whisper)
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',

  // App Settings
  IS_DEV: __DEV__,
  ENABLE_GITHUB_MICROSOFT_OAUTH: process.env.EXPO_PUBLIC_ENABLE_GITHUB_MICROSOFT_OAUTH === 'true',
  AV_ALLOWED_NODE_COMMANDS:
    process.env.EXPO_PUBLIC_AV_ALLOWED_NODE_COMMANDS ||
    'capture_frame,capture_audio,transcribe_audio,extract_entities,assemble_concierge_payload,preview_meeting_concierge,execute_meeting_concierge',
  AV_BLOCKED_NODE_COMMAND_PATTERNS:
    process.env.EXPO_PUBLIC_AV_BLOCKED_NODE_COMMAND_PATTERNS ||
    'rm ,sudo,chmod,chown,mv ,cp ,curl,bash,sh ,powershell,python,node ',
  AV_REQUIRE_REGISTERED_SOURCE_SCOPE:
    process.env.EXPO_PUBLIC_AV_REQUIRE_REGISTERED_SOURCE_SCOPE !== 'false',
  AV_ATTESTATION_SECRET:
    process.env.EXPO_PUBLIC_AV_ATTESTATION_SECRET ||
    'local_dev_av_attestation_secret_v1',
  VOICE_TRANSPORT_MODE:
    process.env.EXPO_PUBLIC_VOICE_TRANSPORT_MODE || 'chunked_fallback',
  VOICE_WEBSOCKET_URL: process.env.EXPO_PUBLIC_VOICE_WEBSOCKET_URL || '',
} as const;

// Validate required env vars at startup
export function validateEnv() {
  const missing: string[] = [];

  if (!ENV.L4YERCAK3_API_URL) {
    missing.push('EXPO_PUBLIC_L4YERCAK3_API_URL');
  }

  if (missing.length > 0 && !ENV.IS_DEV) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
}
