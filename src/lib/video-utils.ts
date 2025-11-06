/**
 * VIDEO UTILITIES
 *
 * Utilities for detecting and embedding YouTube and Vimeo videos
 * Based on reference implementation from eventrrr-beta
 */

export type VideoProvider = 'youtube' | 'vimeo' | 'other';

/**
 * Detect video provider from URL
 * @param url - Video URL to check
 * @returns Provider type: 'youtube', 'vimeo', or 'other'
 */
export const detectVideoProvider = (url: string): VideoProvider => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('vimeo.com')) {
    return 'vimeo';
  }
  return 'other';
};

/**
 * Extract video ID from URL based on provider
 * @param url - Video URL
 * @param provider - Video provider
 * @returns Video ID or null if invalid
 */
export const extractVideoId = (url: string, provider: VideoProvider): string | null => {
  if (provider === 'youtube') {
    // Matches:
    // - youtube.com/watch?v=VIDEO_ID
    // - youtube.com/embed/VIDEO_ID
    // - youtu.be/VIDEO_ID
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  }

  if (provider === 'vimeo') {
    // Matches: vimeo.com/VIDEO_ID or player.vimeo.com/video/VIDEO_ID
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  }

  return null;
};

/**
 * Generate embed URL from video ID and provider
 * @param videoId - Video ID
 * @param provider - Video provider
 * @param loop - Whether to loop the video
 * @param autostart - Whether to autostart the video
 * @returns Embed URL ready for iframe src
 */
export const getVideoEmbedUrl = (
  videoId: string,
  provider: VideoProvider,
  loop: boolean = false,
  autostart: boolean = false
): string => {
  if (provider === 'youtube') {
    const loopParam = loop ? `&loop=1&playlist=${videoId}` : '';
    const autostartParam = autostart ? '1' : '0';
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autostartParam}${loopParam}`;
  }

  if (provider === 'vimeo') {
    const loopParam = loop ? '&loop=1' : '';
    const autostartParam = autostart ? '1' : '0';
    return `https://player.vimeo.com/video/${videoId}?autoplay=${autostartParam}${loopParam}`;
  }

  return '';
};

/**
 * Validate video URL and return provider, ID, and validity
 * @param url - Video URL to validate
 * @returns Validation result with provider, videoId, and valid flag
 */
export const validateVideoUrl = (
  url: string
): { valid: boolean; provider: VideoProvider | null; videoId: string | null } => {
  const provider = detectVideoProvider(url);

  if (provider === 'other') {
    return { valid: false, provider: null, videoId: null };
  }

  const videoId = extractVideoId(url, provider);

  if (!videoId) {
    return { valid: false, provider, videoId: null };
  }

  return { valid: true, provider, videoId };
};
