import type { ChatMessage } from '../types';

/** Mirrors the server's limits (back-end/src/config/chatMedia.ts) so users get errors before uploading. */
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_IMAGE_MAX_DIMENSION = 2048;
export const CHAT_VOICE_MAX_MS = 2 * 60 * 1000;
export const CHAT_VOICE_MIN_MS = 1000;
export const CHAT_WAVEFORM_BARS = 48;

const THUMBNAIL_SIZE = 24;
const JPEG_QUALITY = 0.82;

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** Inbox and notification preview text for a message. */
export const describeMessagePreview = (message: ChatMessage | null, maxLength = 56): string => {
  if (!message) return 'No messages yet';
  if (message.type === 'image') return message.content ? `📷 ${message.content}` : '📷 Photo';
  if (message.type === 'voice') {
    const duration = message.attachment?.durationMs;
    return duration ? `🎤 Voice message · ${formatDuration(duration)}` : '🎤 Voice message';
  }
  const text = message.content ?? '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export interface PreparedImage {
  blob: Blob;
  width?: number;
  height?: number;
  thumbnail?: string;
}

/**
 * Resizes to at most CHAT_IMAGE_MAX_DIMENSION and re-encodes as JPEG, which also drops EXIF data
 * such as GPS location. Formats the browser can't decode (e.g. HEIC outside Safari) are sent as
 * they are; Cloudinary converts them when they're viewed.
 */
export const prepareImage = async (file: File): Promise<PreparedImage> => {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { blob: file };
  }

  const scale = Math.min(1, CHAT_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);

  const thumbScale = THUMBNAIL_SIZE / Math.max(width, height);
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = Math.max(1, Math.round(width * thumbScale));
  thumbCanvas.height = Math.max(1, Math.round(height * thumbScale));
  thumbCanvas.getContext('2d')?.drawImage(bitmap, 0, 0, thumbCanvas.width, thumbCanvas.height);
  const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);
  bitmap.close();

  return { blob: blob ?? file, width, height, thumbnail };
};

/** The first recording format this browser supports: Opus in WebM, or AAC in MP4 on Safari. */
export const pickRecorderMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
};

/** Peak loudness per bar, scaled to 0–255, for the voice message waveform. */
export const computeWaveform = async (
  blob: Blob,
  bars = CHAT_WAVEFORM_BARS,
): Promise<number[] | undefined> => {
  const AudioContextClass = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return undefined;

  const context = new AudioContextClass();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = audio.getChannelData(0);
    const bucketSize = Math.max(1, Math.floor(samples.length / bars));
    const peaks = Array.from({ length: bars }, (_, bar) => {
      let peak = 0;
      const end = Math.min(samples.length, (bar + 1) * bucketSize);
      for (let i = bar * bucketSize; i < end; i += 1) {
        peak = Math.max(peak, Math.abs(samples[i]));
      }
      return peak;
    });
    const loudest = Math.max(...peaks, 0.01);
    return peaks.map((peak) => Math.round((peak / loudest) * 255));
  } catch {
    return undefined;
  } finally {
    void context.close();
  }
};
