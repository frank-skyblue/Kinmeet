import React, { useEffect, useRef, useState } from 'react';
import type { ChatAttachment, ChatUploadState } from '../../types';
import { formatDuration } from '../../utils/chatMedia';
import ChatImageViewer from './ChatImageViewer';

const BUBBLE_MAX_WIDTH = 260;

interface UploadOverlayProps {
  upload: ChatUploadState;
  onRetry?: () => void;
  onDiscard?: () => void;
}

const UploadOverlay: React.FC<UploadOverlayProps> = ({ upload, onRetry, onDiscard }) => {
  if (upload.status === 'uploading') {
    return (
      <div
        className="absolute inset-x-0 bottom-0 h-1.5 bg-overlay"
        role="progressbar"
        aria-label="Uploading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(upload.progress * 100)}
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${upload.progress * 100}%` }} />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-overlay p-2 text-center">
      <p className="font-inter text-xs text-white">{upload.error ?? 'Failed to send'}</p>
      <div className="flex gap-2">
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-kin-sm bg-surface px-3 py-1 text-xs font-semibold text-foreground">
            Retry
          </button>
        )}
        {onDiscard && (
          <button type="button" onClick={onDiscard} className="rounded-kin-sm bg-surface px-3 py-1 text-xs font-semibold text-foreground">
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

interface MediaProps {
  attachment?: ChatAttachment;
  upload?: ChatUploadState;
  isOwn: boolean;
  onRetry?: () => void;
  onDiscard?: () => void;
}

const Unavailable: React.FC<{ label: string }> = ({ label }) => (
  <p className="px-4 py-3 font-inter text-sm italic opacity-80">{label}</p>
);

export const ImageAttachment: React.FC<MediaProps> = ({ attachment, upload, onRetry, onDiscard }) => {
  const [loaded, setLoaded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const src = attachment?.urls?.display;
  if (!attachment || attachment.removed || !src) return <Unavailable label="Photo unavailable" />;

  // Reserve the final size up front so the chat doesn't jump when the image arrives.
  const { width, height } = attachment;
  const aspectRatio = width && height ? `${width} / ${height}` : '4 / 3';

  return (
    <>
      <div className="relative w-full overflow-hidden" style={{ maxWidth: BUBBLE_MAX_WIDTH, aspectRatio }}>
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          disabled={!!upload}
          className="relative block h-full w-full cursor-pointer"
          aria-label="Open photo"
        >
          {attachment.thumbnail && !loaded && (
            <img src={attachment.thumbnail} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-md" />
          )}
          <img
            src={src}
            alt="Photo"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </button>
        {/* A sibling, not inside the button: the retry and remove buttons must stay clickable. */}
        {upload && <UploadOverlay upload={upload} onRetry={onRetry} onDiscard={onDiscard} />}
      </div>
      {viewerOpen && attachment.urls?.full && (
        <ChatImageViewer src={attachment.urls.full} onClose={() => setViewerOpen(false)} />
      )}
    </>
  );
};

export const VoiceAttachment: React.FC<MediaProps> = ({ attachment, upload, isOwn, onRetry, onDiscard }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);

  const src = attachment?.urls?.audio;
  useEffect(() => {
    setIsPlaying(false);
    setPositionMs(0);
  }, [src]);

  if (!attachment || attachment.removed || !src) return <Unavailable label="Voice message unavailable" />;

  const durationMs = attachment.durationMs ?? 0;
  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  const bars = attachment.waveform?.length ? attachment.waveform : Array.from({ length: 32 }, () => 64);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  return (
    <div className="relative flex min-w-56 items-center gap-3 px-3 py-2">
      <button
        type="button"
        onClick={togglePlayback}
        disabled={!!upload}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isOwn ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer'}`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="flex h-8 flex-1 items-center gap-[2px]" aria-hidden>
        {bars.map((value, index) => (
          <span
            key={index}
            className={`w-[3px] rounded-full ${index / bars.length < progress ? 'opacity-100' : 'opacity-40'} ${isOwn ? 'bg-primary-foreground' : 'bg-foreground'}`}
            style={{ height: `${Math.max(12, (value / 255) * 100)}%` }}
          />
        ))}
      </div>
      <span className="shrink-0 font-inter text-xs tabular-nums">
        {formatDuration(isPlaying || positionMs > 0 ? positionMs : durationMs)}
      </span>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setPositionMs(0); }}
        onTimeUpdate={(event) => setPositionMs(event.currentTarget.currentTime * 1000)}
      />
      {upload && <UploadOverlay upload={upload} onRetry={onRetry} onDiscard={onDiscard} />}
    </div>
  );
};
