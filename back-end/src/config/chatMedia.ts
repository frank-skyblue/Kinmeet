export const CHAT_MEDIA_KINDS = ['image', 'voice'] as const;

export type ChatMediaKind = typeof CHAT_MEDIA_KINDS[number];

/** Limits for chat images and voice messages. The client enforces the same values before uploading. */
export const CHAT_MEDIA_LIMITS = {
    image: {
        formats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
        maxBytes: 5 * 1024 * 1024,
        // Client-reported dimensions are display hints; anything larger is rejected as bogus.
        maxDimension: 10000,
    },
    voice: {
        // What browsers record (webm/ogg Opus, mp4/m4a AAC) plus common audio files.
        formats: ['webm', 'weba', 'ogg', 'opus', 'mp4', 'm4a', 'aac', 'mp3', 'wav'],
        maxBytes: 5 * 1024 * 1024,
        maxDurationMs: 2 * 60 * 1000,
        // Recorder timers run slightly past the stop point.
        durationToleranceMs: 2000,
    },
} as const;

/** How long after the upload pass was issued its upload may still be attached to a message. */
export const CHAT_UPLOAD_PASS_TTL_MS = 15 * 60 * 1000;

/** Pending uploads older than this were never sent and are deleted by the cleanup job. */
export const CHAT_ORPHAN_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

export const CHAT_WAVEFORM_MAX_BARS = 64;

/** Small inline preview (data URL) shown while the full image loads. */
export const CHAT_THUMBNAIL_MAX_LENGTH = 4000;
